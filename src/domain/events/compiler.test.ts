import { describe, expect, it } from "vitest";
import { processSemanticDraft } from "@/application/processSemanticDraft";
import { SemanticEventDraft, TranscriptSegment } from "@/domain/model";
import { InMemoryCanonicalEventRepository } from "@/infrastructure/memory/InMemoryCanonicalEventRepository";

const segment: TranscriptSegment = {
  id: "segment_decision",
  conversationId: "conversation_1",
  startMs: 0,
  endMs: 3_000,
  text: "The structural concept was accepted.",
};

const draft: SemanticEventDraft = {
  id: "draft_decision",
  conversationId: "conversation_1",
  proposedType: "decision",
  proposedFunction: "CREATE_DECISION",
  fields: {
    title: "Structural concept",
    objectText: segment.text,
    people: ["Client"],
  },
  parserConfidence: 0.95,
  evidence: [{
    transcriptSegmentId: segment.id,
    startChar: 0,
    endChar: segment.text.length,
    startMs: segment.startMs,
    endMs: segment.endMs,
    quotedText: segment.text,
  }],
  parserModelVersion: "fixture/1",
  warnings: [],
  idempotencyKey: "decision:structural:v1",
};

describe("semantic draft processing", () => {
  it("commits a canonical event with evidence and policy provenance", () => {
    const repository = new InMemoryCanonicalEventRepository();
    const result = processSemanticDraft({
      draft,
      transcripts: new Map([[segment.id, segment]]),
      repository,
      now: () => new Date("2026-09-15T00:00:00.000Z"),
    });

    expect(result.state).toBe("committed");
    if (result.state !== "committed") throw new Error("Expected committed result");
    expect(result.event.evidence).toHaveLength(1);
    expect(result.event.functionName).toBe("CREATE_DECISION");
    expect(result.event.guardDecisionId).toBe(result.guardDecision.id);
  });

  it("returns the original event when the same input is processed twice", () => {
    const repository = new InMemoryCanonicalEventRepository();
    const input = {
      draft,
      transcripts: new Map([[segment.id, segment]]),
      repository,
      now: () => new Date("2026-09-15T00:00:00.000Z"),
    };

    const first = processSemanticDraft(input);
    const second = processSemanticDraft(input);

    expect(first.state).toBe("committed");
    expect(second.state).toBe("committed");
    expect(repository.list()).toHaveLength(1);
    if (first.state === "committed" && second.state === "committed") {
      expect(second.event.id).toBe(first.event.id);
    }
  });

  it("does not commit a draft that requires review", () => {
    const repository = new InMemoryCanonicalEventRepository();
    const result = processSemanticDraft({
      draft: { ...draft, parserConfidence: 0.2 },
      transcripts: new Map([[segment.id, segment]]),
      repository,
    });

    expect(result.state).toBe("review");
    expect(repository.list()).toHaveLength(0);
  });
});

