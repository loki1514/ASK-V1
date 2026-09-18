// The app-level live store. On first launch it seeds the canonical events from
// storage (AsyncStorage) if present; otherwise it builds the demo conversation
// so the shell is never empty. Screens read from this same repo.

import { cleanTranscript } from "@/data/transcripts/cleanTranscript";
import { DemoSemanticParser } from "@/application/parsing/DemoSemanticParser";
import { DeterministicTranscriptParser } from "@/application/parsing/DeterministicTranscriptParser";
import { evaluateDraft } from "@/domain/guards/guardEngine";
import { compileCanonicalEvent } from "@/domain/events/compiler";
import { MemoryView, TranscriptSegment } from "@/domain/model";
import { LexicalRetrievalEngine } from "@/lib/retrieval";
import { projectEventToMemory } from "@/data/memories";
import { hydrateStore, RehydratedCanonicalEventRepository, debouncedPersist, persistFollowUps, persistEvents } from "@/infrastructure/storage/AsyncPersistence";
import { followUpRepository } from "@/domain/people";

export const liveEventRepository = new RehydratedCanonicalEventRepository([]);

let seededTranscript: TranscriptSegment[] = [];

// Called once from the root layout before rendering the shell.
export async function initializeLiveStore(): Promise<void> {
  const { events, followUps } = await hydrateStore();

  if (events.length) {
    // Rehydrate repo from storage.
    for (const event of events) {
      liveEventRepository.commit({
        draft: { id: `rehydrated_${event.id}`, conversationId: event.conversationId, proposedType: event.type, proposedFunction: event.functionName, fields: { title: event.title, objectText: event.objectText, actor: event.actor, people: event.people, project: event.project, deadlineAt: event.deadlineAt, status: event.status }, parserConfidence: event.confidence.parser, evidence: event.evidence, parserModelVersion: event.parserModelVersion, warnings: [], idempotencyKey: event.idempotencyKey },
        guardDecision: { id: event.guardDecisionId, draftId: `rehydrated_${event.id}`, outcome: "allow_commit", ruleResults: [], normalizedFields: { title: event.title, objectText: event.objectText, actor: event.actor, people: event.people, project: event.project, deadlineAt: event.deadlineAt, status: event.status }, requiredConfirmation: "none", policyVersion: "guard-policy/1.0.0", createdAt: event.createdAt },
        event,
      });
    }
    for (const f of followUps) followUpRepository.add(f);
    return;
  }

  // First launch: seed the demo conversation through the real pipeline.
  const parser = new DeterministicTranscriptParser();
  const semantic = new DemoSemanticParser();
  const conversation = parser.parseSync(cleanTranscript, "clean");
  const drafts = semantic.extractSync(conversation.segments);
  seededTranscript = conversation.segments;
  const transcriptMap = new Map(conversation.segments.map((s) => [s.id, s]));
  const now = () => new Date("2026-09-18T09:42:00.000Z");

  for (const draft of drafts) {
    const decision = evaluateDraft(draft, { transcriptSegments: transcriptMap, existingIdempotencyKeys: liveEventRepository.idempotencyKeys(), now });
    if (decision.outcome === "allow_commit") {
      compileCanonicalEvent(draft, decision, { repository: liveEventRepository, now });
    }
  }
  debouncedPersist(() => persistEvents(liveEventRepository.list()));
}

export const liveTranscriptSegments: TranscriptSegment[] = seededTranscript;

export const liveMemoryRepository = {
  list(): MemoryView[] {
    return liveEventRepository.list().map(projectEventToMemory);
  },
};

export const liveRetrievalEngine = new LexicalRetrievalEngine(liveMemoryRepository);

export function answerFromLiveMemory(query: string) {
  return liveRetrievalEngine.answer(query);
}

export function persistFollowUpsNow(): void {
  debouncedPersist(() => persistFollowUps(followUpRepository.list()));
}
