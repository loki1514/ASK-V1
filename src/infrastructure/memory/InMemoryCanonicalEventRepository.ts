import { CanonicalEvent, GuardDecision, SemanticEventDraft } from "@/domain/model";
import { CanonicalEventRepository } from "@/domain/repositories";

export class InMemoryCanonicalEventRepository implements CanonicalEventRepository {
  private readonly events = new Map<string, CanonicalEvent>();
  private readonly byIdempotencyKey = new Map<string, string>();
  private readonly drafts = new Map<string, SemanticEventDraft>();
  private readonly guardDecisions = new Map<string, GuardDecision>();

  findByIdempotencyKey(idempotencyKey: string): CanonicalEvent | undefined {
    const eventId = this.byIdempotencyKey.get(idempotencyKey);
    return eventId ? this.events.get(eventId) : undefined;
  }

  list(): CanonicalEvent[] {
    return [...this.events.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  idempotencyKeys(): ReadonlySet<string> {
    return new Set(this.byIdempotencyKey.keys());
  }

  commit(input: {
    draft: SemanticEventDraft;
    guardDecision: GuardDecision;
    event: CanonicalEvent;
  }): CanonicalEvent {
    const existing = this.findByIdempotencyKey(input.event.idempotencyKey);
    if (existing) {
      return existing;
    }

    if (!input.event.evidence.length) {
      throw new Error("Canonical events require evidence");
    }

    this.drafts.set(input.draft.id, input.draft);
    this.guardDecisions.set(input.guardDecision.id, input.guardDecision);
    this.events.set(input.event.id, input.event);
    this.byIdempotencyKey.set(input.event.idempotencyKey, input.event.id);
    return input.event;
  }
}

