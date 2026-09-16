import { CanonicalEvent, GuardDecision, SemanticEventDraft } from "@/domain/model";

export interface CanonicalEventRepository {
  findByIdempotencyKey(idempotencyKey: string): CanonicalEvent | undefined;
  list(): CanonicalEvent[];
  idempotencyKeys(): ReadonlySet<string>;
  commit(input: {
    draft: SemanticEventDraft;
    guardDecision: GuardDecision;
    event: CanonicalEvent;
  }): CanonicalEvent;
}

