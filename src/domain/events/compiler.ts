import { getFunctionDefinition } from "@/domain/functions/registry";
import { CanonicalEvent, GuardDecision, SemanticEventDraft } from "@/domain/model";
import { CanonicalEventRepository } from "@/domain/repositories";

export class EventCompilationError extends Error {
  constructor(
    message: string,
    readonly code:
      | "GUARD_NOT_ALLOWED"
      | "FUNCTION_NOT_REGISTERED"
      | "FUNCTION_TYPE_MISMATCH",
  ) {
    super(message);
    this.name = "EventCompilationError";
  }
}

export type CompilerDependencies = {
  repository: CanonicalEventRepository;
  now?: () => Date;
  makeId?: () => string;
};

export function compileCanonicalEvent(
  draft: SemanticEventDraft,
  guardDecision: GuardDecision,
  dependencies: CompilerDependencies,
): CanonicalEvent {
  const existing = dependencies.repository.findByIdempotencyKey(draft.idempotencyKey);
  if (existing) {
    return existing;
  }

  if (guardDecision.outcome !== "allow_commit") {
    throw new EventCompilationError(
      `Draft ${draft.id} cannot commit with guard outcome ${guardDecision.outcome}`,
      "GUARD_NOT_ALLOWED",
    );
  }

  const functionDefinition = getFunctionDefinition(draft.proposedFunction);
  if (!functionDefinition) {
    throw new EventCompilationError(
      `Function ${draft.proposedFunction} is not registered`,
      "FUNCTION_NOT_REGISTERED",
    );
  }

  if (functionDefinition.eventType !== draft.proposedType) {
    throw new EventCompilationError(
      `Function ${draft.proposedFunction} cannot create ${draft.proposedType}`,
      "FUNCTION_TYPE_MISMATCH",
    );
  }

  const now = dependencies.now?.() ?? new Date();
  const event: CanonicalEvent = {
    id: dependencies.makeId?.() ?? `event_${draft.id}`,
    conversationId: draft.conversationId,
    type: draft.proposedType,
    functionName: draft.proposedFunction,
    title: guardDecision.normalizedFields.title,
    objectText: functionDefinition.renderSummary({
      ...draft,
      fields: guardDecision.normalizedFields,
    }),
    actor: guardDecision.normalizedFields.actor,
    people: guardDecision.normalizedFields.people ?? [],
    project: guardDecision.normalizedFields.project,
    deadlineAt: guardDecision.normalizedFields.deadlineAt,
    status: guardDecision.normalizedFields.status ?? functionDefinition.defaultStatus,
    confidence: {
      parser: draft.parserConfidence,
      aggregate: draft.parserConfidence,
    },
    evidence: draft.evidence.map((span) => ({ ...span })),
    guardDecisionId: guardDecision.id,
    schemaVersion: 1,
    parserModelVersion: draft.parserModelVersion,
    createdAt: now.toISOString(),
    supersedesEventId: guardDecision.normalizedFields.supersedesEventId,
    idempotencyKey: draft.idempotencyKey,
  };

  return dependencies.repository.commit({ draft, guardDecision, event });
}

