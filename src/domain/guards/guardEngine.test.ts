import { describe, expect, it } from "vitest";
import { evaluateDraft } from "@/domain/guards/guardEngine";
import { SemanticEventDraft, TranscriptSegment } from "@/domain/model";

const segment: TranscriptSegment = {
  id: "segment_1",
  conversationId: "conversation_1",
  startMs: 1_000,
  endMs: 4_000,
  text: "Rohit will send the drawings by Friday.",
};

const validDraft: SemanticEventDraft = {
  id: "draft_1",
  conversationId: "conversation_1",
  proposedType: "action",
  proposedFunction: "CREATE_ACTION",
  fields: {
    title: "Send drawings",
    objectText: segment.text,
    actor: "Rohit",
    people: ["Rohit"],
    deadlineAt: "2026-09-18",
  },
  parserConfidence: 0.9,
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
  idempotencyKey: "draft:1",
};

const context = {
  transcriptSegments: new Map([[segment.id, segment]]),
  existingIdempotencyKeys: new Set<string>(),
  now: () => new Date("2026-09-15T00:00:00.000Z"),
};

describe("evaluateDraft", () => {
  it("allows a complete, evidenced, high-confidence draft", () => {
    const decision = evaluateDraft(validDraft, context);

    expect(decision.outcome).toBe("allow_commit");
    expect(decision.normalizedFields.actor).toBe("Rohit");
    expect(decision.ruleResults.every((rule) => rule.result === "pass")).toBe(true);
  });

  it("denies a draft whose evidence quote does not match the transcript", () => {
    const decision = evaluateDraft({
      ...validDraft,
      evidence: [{ ...validDraft.evidence[0], quotedText: "Invented evidence" }],
    }, context);

    expect(decision.outcome).toBe("deny");
    expect(decision.ruleResults).toContainEqual(expect.objectContaining({
      reasonCode: "EVIDENCE_TEXT_MISMATCH",
      result: "fail",
    }));
  });

  it("requires review for low confidence instead of committing", () => {
    const decision = evaluateDraft({ ...validDraft, parserConfidence: 0.4 }, context);

    expect(decision.outcome).toBe("require_review");
    expect(decision.requiredConfirmation).toBe("user_before_commit");
  });

  it("denies a replayed idempotency key", () => {
    const decision = evaluateDraft(validDraft, {
      ...context,
      existingIdempotencyKeys: new Set([validDraft.idempotencyKey]),
    });

    expect(decision.outcome).toBe("deny");
    expect(decision.ruleResults).toContainEqual(expect.objectContaining({ reasonCode: "DUPLICATE_DRAFT" }));
  });
});

