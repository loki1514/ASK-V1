import { getFunctionDefinition } from "@/domain/functions/registry";
import {
  DraftFields,
  GuardDecision,
  GuardOutcome,
  RuleResult,
  SemanticEventDraft,
  TranscriptSegment,
} from "@/domain/model";

export type GuardContext = {
  transcriptSegments: ReadonlyMap<string, TranscriptSegment>;
  existingIdempotencyKeys: ReadonlySet<string>;
  minimumCommitConfidence?: number;
  now?: () => Date;
  makeId?: () => string;
};

const pass = (ruleId: string, reasonCode: string): RuleResult => ({
  ruleId,
  result: "pass",
  reasonCode,
});

const fail = (ruleId: string, reasonCode: string): RuleResult => ({
  ruleId,
  result: "fail",
  reasonCode,
});

const warn = (ruleId: string, reasonCode: string): RuleResult => ({
  ruleId,
  result: "warn",
  reasonCode,
});

const normalizeFields = (fields: DraftFields): DraftFields => ({
  ...fields,
  title: fields.title.trim(),
  objectText: fields.objectText.trim().replace(/\s+/g, " "),
  actor: fields.actor?.trim(),
  people: [...new Set((fields.people ?? []).map((person) => person.trim()).filter(Boolean))],
  project: fields.project?.trim(),
  deadlineAt: fields.deadlineAt?.trim(),
});

function validateEvidence(
  draft: SemanticEventDraft,
  segments: ReadonlyMap<string, TranscriptSegment>,
): RuleResult {
  if (!draft.evidence.length) {
    return fail("evidence.required", "NO_EVIDENCE");
  }

  for (const span of draft.evidence) {
    const segment = segments.get(span.transcriptSegmentId);
    if (!segment || segment.conversationId !== draft.conversationId) {
      return fail("evidence.boundary", "SEGMENT_NOT_IN_CONVERSATION");
    }

    const validBounds =
      span.startChar >= 0 &&
      span.endChar > span.startChar &&
      span.endChar <= segment.text.length &&
      span.startMs >= segment.startMs &&
      span.endMs <= segment.endMs;

    if (!validBounds) {
      return fail("evidence.boundary", "INVALID_EVIDENCE_BOUNDS");
    }

    if (segment.text.slice(span.startChar, span.endChar) !== span.quotedText) {
      return fail("evidence.quote", "EVIDENCE_TEXT_MISMATCH");
    }
  }

  return pass("evidence.valid", "EVIDENCE_VERIFIED");
}

function selectOutcome(results: RuleResult[]): GuardOutcome {
  if (results.some((result) => result.result === "fail")) {
    return "deny";
  }

  if (results.some((result) => result.result === "warn")) {
    return "require_review";
  }

  return "allow_commit";
}

export function evaluateDraft(
  draft: SemanticEventDraft,
  context: GuardContext,
): GuardDecision {
  const results: RuleResult[] = [];
  const normalizedFields = normalizeFields(draft.fields);
  const functionDefinition = getFunctionDefinition(draft.proposedFunction);

  if (!functionDefinition) {
    results.push(fail("function.known", "UNKNOWN_FUNCTION"));
  } else if (functionDefinition.eventType !== draft.proposedType) {
    results.push(fail("function.event_type", "FUNCTION_EVENT_TYPE_MISMATCH"));
  } else {
    results.push(pass("function.registered", "FUNCTION_REGISTERED"));

    const missing = functionDefinition.requiredFields.filter((key) => {
      const value = normalizedFields[key];
      return value === undefined || value === "";
    });
    results.push(
      missing.length
        ? fail("schema.required_fields", `MISSING_${missing.join("_").toUpperCase()}`)
        : pass("schema.required_fields", "REQUIRED_FIELDS_PRESENT"),
    );
  }

  results.push(validateEvidence(draft, context.transcriptSegments));

  if (draft.parserConfidence < 0 || draft.parserConfidence > 1) {
    results.push(fail("confidence.range", "CONFIDENCE_OUT_OF_RANGE"));
  } else if (draft.parserConfidence < (context.minimumCommitConfidence ?? 0.65)) {
    results.push(warn("confidence.minimum", "LOW_PARSER_CONFIDENCE"));
  } else {
    results.push(pass("confidence.minimum", "CONFIDENCE_ACCEPTED"));
  }

  results.push(
    context.existingIdempotencyKeys.has(draft.idempotencyKey)
      ? fail("idempotency.unique", "DUPLICATE_DRAFT")
      : pass("idempotency.unique", "IDEMPOTENCY_KEY_AVAILABLE"),
  );

  if (draft.fields.deadlineAt && !/^\d{4}-\d{2}-\d{2}(T.*Z)?$/.test(draft.fields.deadlineAt)) {
    results.push(warn("date.normalized", "UNRESOLVED_DEADLINE"));
  } else {
    results.push(pass("date.normalized", "DATE_NORMALIZED_OR_ABSENT"));
  }

  const injectionPattern = /ignore (all|any|the|previous).*instructions|system prompt|developer message/i;
  results.push(
    injectionPattern.test(draft.fields.objectText)
      ? warn("content.untrusted", "TRANSCRIPT_CONTAINS_INSTRUCTION_LIKE_TEXT")
      : pass("content.untrusted", "CONTENT_TREATED_AS_DATA"),
  );

  const now = context.now?.() ?? new Date();
  const makeId = context.makeId ?? (() => `guard_${draft.id}`);
  const outcome = selectOutcome(results);

  return {
    id: makeId(),
    draftId: draft.id,
    outcome,
    ruleResults: results,
    normalizedFields,
    requiredConfirmation:
      outcome === "require_review"
        ? "user_before_commit"
        : functionDefinition?.confirmation ?? "none",
    policyVersion: "guard-policy/1.0.0",
    createdAt: now.toISOString(),
  };
}

