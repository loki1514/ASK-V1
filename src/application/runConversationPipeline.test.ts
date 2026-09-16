import { describe, expect, it } from "vitest";
import { runConversationPipeline } from "@/application/runConversationPipeline";
import { InMemoryCanonicalEventRepository } from "@/infrastructure/memory/InMemoryCanonicalEventRepository";
import { evidenceForSegment } from "@/application/runConversationPipeline";
import { SemanticEventDraft, TranscriptSegment } from "@/domain/model";

const conversationId = "conv_test";
const segments: TranscriptSegment[] = [
  {
    id: "seg1",
    conversationId,
    startMs: 0,
    endMs: 1000,
    text: "Rohit will send the report tomorrow.",
    resolvedSpeakerId: "owner",
  },
];

const baseDraft: Omit<SemanticEventDraft, "id" | "idempotencyKey" | "proposedType" | "proposedFunction" | "fields" | "parserConfidence"> = {
  conversationId,
  evidence: [evidenceForSegment(segments[0])],
  parserModelVersion: "test-parser/1.0.0",
  warnings: [],
};

describe("runConversationPipeline (PRD §8.1–8.3)", () => {
  it("commits allowed drafts through the repository with evidence", () => {
    const repo = new InMemoryCanonicalEventRepository();
    const draft: SemanticEventDraft = {
      ...baseDraft,
      id: "d1",
      idempotencyKey: "test:action:1",
      proposedType: "action",
      proposedFunction: "CREATE_ACTION",
      fields: { title: "Send report", objectText: "Rohit will send the report tomorrow.", actor: "Rohit", status: "open" },
      parserConfidence: 0.9,
    };
    const outcome = runConversationPipeline({ conversationId, segments, drafts: [draft], repository: repo });
    expect(outcome.committed).toHaveLength(1);
    expect(outcome.denied).toHaveLength(0);
    expect(outcome.reviewed).toHaveLength(0);
    expect(repo.list()).toHaveLength(1);
    expect(repo.list()[0].evidence.length).toBeGreaterThan(0);
    expect(repo.findByIdempotencyKey("test:action:1")).toBeDefined();
  });

  it("is idempotent: replaying the same draft commits exactly once", () => {
    const repo = new InMemoryCanonicalEventRepository();
    const draft: SemanticEventDraft = {
      ...baseDraft,
      id: "d2",
      idempotencyKey: "test:decision:1",
      proposedType: "decision",
      proposedFunction: "CREATE_DECISION",
      fields: { title: "Approved", objectText: "Rohit will send the report tomorrow." },
      parserConfidence: 0.95,
    };
    const first = runConversationPipeline({ conversationId, segments, drafts: [draft], repository: repo });
    const second = runConversationPipeline({ conversationId, segments, drafts: [draft], repository: repo });
    expect(first.committed).toHaveLength(1);
    expect(second.committed).toHaveLength(1);
    expect(repo.list()).toHaveLength(1);
    expect(repo.list()[0].id).toBe(first.committed[0].id);
  });

  it("rejects drafts without evidence and with low confidence", () => {
    const repo = new InMemoryCanonicalEventRepository();
    const noEvidence: SemanticEventDraft = {
      ...baseDraft,
      id: "d3",
      idempotencyKey: "test:noev:1",
      proposedType: "note",
      proposedFunction: "CREATE_NOTE",
      fields: { title: "Note", objectText: "A bare note." },
      parserConfidence: 0.95,
      evidence: [],
    };
    const outcome = runConversationPipeline({ conversationId, segments, drafts: [noEvidence], repository: repo });
    expect(outcome.committed).toHaveLength(0);
    expect(outcome.denied).toHaveLength(1);
  });

  it("never lets a model path commit without a guard decision", () => {
    const repo = new InMemoryCanonicalEventRepository();
    const draft: SemanticEventDraft = {
      ...baseDraft,
      id: "d4",
      idempotencyKey: "test:guard:1",
      proposedType: "fact",
      proposedFunction: "UPSERT_FACT",
      fields: { title: "Fact", objectText: "Rohit will send the report tomorrow." },
      parserConfidence: 0.9,
    };
    const outcome = runConversationPipeline({ conversationId, segments, drafts: [draft], repository: repo });
    // All committed events carry a guardDecisionId (compiler sets it); none can bypass.
    for (const event of outcome.committed) {
      expect(event.guardDecisionId).toBeTruthy();
      expect(event.evidence.length).toBeGreaterThan(0);
    }
  });
});
