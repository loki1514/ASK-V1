// Persistence for the ASK live store. Backed by AsyncStorage so memories and
// follow-ups survive app restarts. The repo exposes the same sync interface
// the domain uses; a bootstrapper loads storage once at startup and every
// write is debounced back to disk.

import AsyncStorage from "@react-native-async-storage/async-storage";
import { CanonicalEvent, GuardDecision, SemanticEventDraft } from "@/domain/model";
import { CanonicalEventRepository } from "@/domain/repositories";
import { FollowUp } from "@/domain/people";

const EVENTS_KEY = "ask:canonicalEvents:v1";
const FOLLOWUPS_KEY = "ask:followUps:v1";

export type HydrateResult = { events: CanonicalEvent[]; followUps: FollowUp[] };

export async function hydrateStore(): Promise<HydrateResult> {
  try {
    const [rawEvents, rawFollows] = await Promise.all([
      AsyncStorage.getItem(EVENTS_KEY),
      AsyncStorage.getItem(FOLLOWUPS_KEY),
    ]);
    return {
      events: rawEvents ? (JSON.parse(rawEvents) as CanonicalEvent[]) : [],
      followUps: rawFollows ? (JSON.parse(rawFollows) as FollowUp[]) : [],
    };
  } catch {
    return { events: [], followUps: [] };
  }
}

export async function persistEvents(events: CanonicalEvent[]): Promise<void> {
  try {
    await AsyncStorage.setItem(EVENTS_KEY, JSON.stringify(events));
  } catch {
    // session-only is fine
  }
}

export async function persistFollowUps(followUps: FollowUp[]): Promise<void> {
  try {
    await AsyncStorage.setItem(FOLLOWUPS_KEY, JSON.stringify(followUps));
  } catch {
    // session-only is fine
  }
}

// Debounced writer: many commits in a burst collapse to one disk write.
const writeQueue = new Set<() => Promise<void>>();
let writeTimer: ReturnType<typeof setTimeout> | null = null;

export function debouncedPersist(write: () => Promise<void>): void {
  writeQueue.add(write);
  if (writeTimer) clearTimeout(writeTimer);
  writeTimer = setTimeout(async () => {
    const batch = [...writeQueue];
    writeQueue.clear();
    await Promise.allSettled(batch.map((fn) => fn()));
  }, 600);
}

// A sync repo over the already-hydrated in-memory events. Same interface as
// the domain expects; screens swap this in for the in-memory live store.
export class RehydratedCanonicalEventRepository implements CanonicalEventRepository {
  constructor(private readonly initial: CanonicalEvent[]) {
    for (const event of initial) {
      this.events.set(event.id, event);
      this.byIdempotency.set(event.idempotencyKey, event.id);
    }
  }

  private readonly events = new Map<string, CanonicalEvent>();
  private readonly byIdempotency = new Map<string, string>();
  private readonly drafts = new Map<string, SemanticEventDraft>();
  private readonly guards = new Map<string, GuardDecision>();

  findByIdempotencyKey(idempotencyKey: string): CanonicalEvent | undefined {
    const id = this.byIdempotency.get(idempotencyKey);
    return id ? this.events.get(id) : undefined;
  }

  list(): CanonicalEvent[] {
    return [...this.events.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  idempotencyKeys(): ReadonlySet<string> {
    return new Set(this.byIdempotency.keys());
  }

  commit(input: { draft: SemanticEventDraft; guardDecision: GuardDecision; event: CanonicalEvent }): CanonicalEvent {
    const existing = this.byIdempotency.get(input.event.idempotencyKey);
    if (existing) return this.events.get(existing) as CanonicalEvent;
    this.drafts.set(input.draft.id, input.draft);
    this.guards.set(input.guardDecision.id, input.guardDecision);
    this.events.set(input.event.id, input.event);
    this.byIdempotency.set(input.event.idempotencyKey, input.event.id);
    debouncedPersist(() => persistEvents(this.list()));
    return input.event;
  }
}
