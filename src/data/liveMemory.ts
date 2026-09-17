import { DemoSemanticParser } from "@/application/parsing/DemoSemanticParser";
import { DeterministicTranscriptParser } from "@/application/parsing/DeterministicTranscriptParser";
import { compileCanonicalEvent } from "@/domain/events/compiler";
import { evaluateDraft } from "@/domain/guards/guardEngine";
import { MemoryView, TranscriptSegment } from "@/domain/model";
import { InMemoryCanonicalEventRepository } from "@/infrastructure/memory/InMemoryCanonicalEventRepository";
import { LexicalRetrievalEngine } from "@/lib/retrieval";
import { projectEventToMemory } from "@/data/memories";
import { cleanTranscript } from "@/data/transcripts/cleanTranscript";

const transcriptParser = new DeterministicTranscriptParser();
const semanticParser = new DemoSemanticParser();
const seededConversation = transcriptParser.parseSync(cleanTranscript, "clean");
const seededDrafts = semanticParser.extractSync(seededConversation.segments);

export const liveEventRepository = new InMemoryCanonicalEventRepository();
export const liveTranscriptSegments: TranscriptSegment[] = seededConversation.segments;
export const liveConversationId = seededConversation.id;

const transcriptMap = new Map(seededConversation.segments.map((segment) => [segment.id, segment]));
const fixedNow = () => new Date("2026-09-18T09:42:00.000Z");

for (const draft of seededDrafts) {
  const decision = evaluateDraft(draft, {
    transcriptSegments: transcriptMap,
    existingIdempotencyKeys: liveEventRepository.idempotencyKeys(),
    now: fixedNow,
  });
  if (decision.outcome === "allow_commit") {
    compileCanonicalEvent(draft, decision, { repository: liveEventRepository, now: fixedNow });
  }
}

export const liveMemoryRepository = {
  list(): MemoryView[] {
    return liveEventRepository.list().map(projectEventToMemory);
  },
};

export const liveRetrievalEngine = new LexicalRetrievalEngine(liveMemoryRepository);

export function answerFromLiveMemory(query: string) {
  return liveRetrievalEngine.answer(query);
}
