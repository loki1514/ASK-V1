import { demoCanonicalEvents, demoDrafts, demoEventRepository, demoTranscriptSegments, conversationId } from "@/data/demoDomain";
import { InMemoryCanonicalEventRepository } from "@/infrastructure/memory/InMemoryCanonicalEventRepository";
import { projectEventToMemory } from "@/data/memories";
import { MemoryView, TranscriptSegment } from "@/domain/model";
import { LexicalRetrievalEngine } from "@/lib/retrieval";

// A shared, user-driven index in front of the canonical-events repository.
// All screens (Home, Ask, Activity) render from this single live store, so
// committing a memory makes it appear everywhere immediately.
export const liveEventRepository = new InMemoryCanonicalEventRepository();
export const liveTranscriptSegments: TranscriptSegment[] = [...demoTranscriptSegments];
export const liveConversationId = conversationId;

// Seed the live store with the PRD fixture canonical events (the demo conversation).
for (const event of demoCanonicalEvents) {
  const draft = demoDrafts.find((d) => d.idempotencyKey === event.idempotencyKey);
  if (draft) {
    // Re-commit through the same idempotency path to guarantee the reside in one store.
    liveEventRepository.findByIdempotencyKey(draft.idempotencyKey) ?? liveEventRepository.commit({
      draft,
      guardDecision: { id: event.guardDecisionId, draftId: draft.id, outcome: "allow_commit", ruleResults: [], normalizedFields: draft.fields, requiredConfirmation: "none", policyVersion: "guard-policy/1.0.0", createdAt: event.createdAt },
      event: { ...event, id: event.id },
    });
  }
}

import { memoryRepository } from "@/data/memories";
export const liveMemoryRepository = {
  list(): MemoryView[] {
    // Live store first, then fall back to the demo projection for content still seeded.
    const fromStore = liveEventRepository.list().map(projectEventToMemory);
    const ids = new Set(fromStore.map((m) => m.id));
    const fromDemo = memoryRepository.list().filter((m) => !ids.has(m.id));
    return [...fromDemo, ...fromStore];
  },
};

export const liveRetrievalEngine = new LexicalRetrievalEngine(liveMemoryRepository);
export function answerFromLiveMemory(query: string) {
  return liveRetrievalEngine.answer(query);
}
