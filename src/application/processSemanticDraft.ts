import { compileCanonicalEvent } from "@/domain/events/compiler";
import { evaluateDraft } from "@/domain/guards/guardEngine";
import { CanonicalEvent, GuardDecision, SemanticEventDraft, TranscriptSegment } from "@/domain/model";
import { CanonicalEventRepository } from "@/domain/repositories";

export type ProcessDraftResult =
  | { state: "committed"; guardDecision: GuardDecision; event: CanonicalEvent }
  | { state: "review" | "denied"; guardDecision: GuardDecision };

export function processSemanticDraft(input: {
  draft: SemanticEventDraft;
  transcripts: ReadonlyMap<string, TranscriptSegment>;
  repository: CanonicalEventRepository;
  minimumCommitConfidence?: number;
  now?: () => Date;
}): ProcessDraftResult {
  const existing = input.repository.findByIdempotencyKey(input.draft.idempotencyKey);
  if (existing) {
    return {
      state: "committed",
      event: existing,
      guardDecision: {
        id: existing.guardDecisionId,
        draftId: input.draft.id,
        outcome: "allow_commit",
        ruleResults: [],
        normalizedFields: input.draft.fields,
        requiredConfirmation: "none",
        policyVersion: "guard-policy/1.0.0",
        createdAt: existing.createdAt,
      },
    };
  }

  const guardDecision = evaluateDraft(input.draft, {
    transcriptSegments: input.transcripts,
    existingIdempotencyKeys: input.repository.idempotencyKeys(),
    minimumCommitConfidence: input.minimumCommitConfidence,
    now: input.now,
  });

  if (guardDecision.outcome === "deny") {
    return { state: "denied", guardDecision };
  }

  if (guardDecision.outcome === "require_review") {
    return { state: "review", guardDecision };
  }

  const event = compileCanonicalEvent(input.draft, guardDecision, {
    repository: input.repository,
    now: input.now,
  });
  return { state: "committed", guardDecision, event };
}

