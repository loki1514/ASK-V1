import { CanonicalEvent, GuardDecision, SemanticEventDraft } from "@/domain/model";
import { CanonicalEventRepository } from "@/domain/repositories";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const STORAGE_KEY = "ask.canonical_events.v1";

/**
 * Persistent Canonical Event Repository
 * Persists canonical events to device storage (SecureStore on native, localStorage on web)
 * with an in-memory cache and idempotency lookups.
 */
export class PersistentCanonicalEventRepository implements CanonicalEventRepository {
  private readonly events = new Map<string, CanonicalEvent>();
  private readonly byIdempotencyKey = new Map<string, string>();
  private readonly drafts = new Map<string, SemanticEventDraft>();
  private readonly guardDecisions = new Map<string, GuardDecision>();

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage(): void {
    try {
      let raw: string | null = null;
      if (Platform.OS === "web") {
        if (typeof window !== "undefined" && window.localStorage) {
          raw = window.localStorage.getItem(STORAGE_KEY);
        }
      } else {
        raw = SecureStore.getItem(STORAGE_KEY);
      }

      if (raw) {
        const parsed: CanonicalEvent[] = JSON.parse(raw);
        for (const ev of parsed) {
          this.events.set(ev.id, ev);
          this.byIdempotencyKey.set(ev.idempotencyKey, ev.id);
        }
      }
    } catch {
      // Ephemeral fallback if storage unavailable
    }
  }

  private saveToStorage(): void {
    try {
      const payload = JSON.stringify([...this.events.values()]);
      if (Platform.OS === "web") {
        if (typeof window !== "undefined" && window.localStorage) {
          window.localStorage.setItem(STORAGE_KEY, payload);
        }
      } else {
        SecureStore.setItem(STORAGE_KEY, payload);
      }
    } catch {
      // Ignore write errors in restricted sandbox
    }
  }

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

    this.saveToStorage();
    return input.event;
  }

  clear(): void {
    this.events.clear();
    this.byIdempotencyKey.clear();
    this.drafts.clear();
    this.guardDecisions.clear();
    this.saveToStorage();
  }
}

export const persistentEventRepository = new PersistentCanonicalEventRepository();
