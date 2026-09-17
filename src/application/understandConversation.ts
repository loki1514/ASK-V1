import { compileCanonicalEvent } from "@/domain/events/compiler";
import { evaluateDraft } from "@/domain/guards/guardEngine";
import { CanonicalEvent, GuardDecision, ParsedConversation, SemanticEventDraft } from "@/domain/model";
import { CanonicalEventRepository } from "@/domain/repositories";
import { DemoSemanticParser } from "@/application/parsing/DemoSemanticParser";
import { DeterministicTranscriptParser } from "@/application/parsing/DeterministicTranscriptParser";
import { ConversationSummary, renderSummary } from "@/application/renderSummary";

export type UnderstoodConversation = {
  conversation: ParsedConversation;
  drafts: SemanticEventDraft[];
  guards: GuardDecision[];
  events: CanonicalEvent[];
  summary: ConversationSummary;
  ignoredStatements: Array<{ text: string; reason: string }>;
};

// A session-scoped repository: a fresh understand run is guarded as if new
// (no duplicate denials), while commits still flow through to the shared
// upstream store, which dedupes by idempotency key.
export class SessionCanonicalEventRepository implements CanonicalEventRepository {
  private readonly inner: Map<string, CanonicalEvent> = new Map();
  constructor(private readonly upstream: CanonicalEventRepository) {}

  findByIdempotencyKey(idempotencyKey: string): CanonicalEvent | undefined {
    return this.inner.get(idempotencyKey);
  }
  list(): CanonicalEvent[] {
    return [...this.inner.values()].concat(this.upstream.list());
  }
  idempotencyKeys(): ReadonlySet<string> {
    return new Set(this.inner.keys());
  }
  commit(input: { draft: SemanticEventDraft; guardDecision: GuardDecision; event: CanonicalEvent }): CanonicalEvent {
    this.inner.set(input.event.idempotencyKey, input.event);
    return this.upstream.commit(input);
  }
}

export async function understandConversation(input: {
  transcript: string;
  source: ParsedConversation["source"];
  repository: CanonicalEventRepository;
  now?: () => Date;
}): Promise<UnderstoodConversation> {
  const transcriptParser = new DeterministicTranscriptParser();
  const semanticParser = new DemoSemanticParser();
  const conversation = await transcriptParser.parse(input.transcript, input.source);
  const drafts = await semanticParser.extract(conversation.segments);
  conversation.events = drafts;
  const transcriptMap = new Map(conversation.segments.map((segment) => [segment.id, segment]));
  const guards: GuardDecision[] = [];
  const events: CanonicalEvent[] = [];

  for (const draft of drafts) {
    // Always evaluate the guard so the UI can show the verification checklist,
    // even on an idempotent replay (the guard outcome is deterministic).
    const guard = evaluateDraft(draft, {
      transcriptSegments: transcriptMap,
      existingIdempotencyKeys: input.repository.idempotencyKeys(),
      now: input.now,
    });
    guards.push(guard);

    const existing = input.repository.findByIdempotencyKey(draft.idempotencyKey);
    if (existing) {
      events.push(existing);
      continue;
    }
    if (guard.outcome === "allow_commit") {
      events.push(compileCanonicalEvent(draft, guard, { repository: input.repository, now: input.now }));
    }
  }

  return {
    conversation,
    drafts,
    guards,
    events,
    summary: renderSummary(events, conversation.title),
    ignoredStatements: conversation.segments
      .filter((segment) => /maybe we should reduce.*100/i.test(segment.text))
      .map((segment) => ({ text: segment.text, reason: "No commitment or assignment detected." })),
  };
}

