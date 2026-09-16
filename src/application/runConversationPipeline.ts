import {
  CanonicalEvent,
  EvidenceSpan,
  GuardDecision,
  SemanticEventDraft,
  TranscriptSegment,
} from "@/domain/model";
import { evaluateDraft } from "@/domain/guards/guardEngine";
import { compileCanonicalEvent } from "@/domain/events/compiler";
import { CanonicalEventRepository } from "@/domain/repositories";

// PRD §8.1–8.3: end-to-end conversation lifecycle with explicit states.
export type ConversationState =
  | "idle"
  | "listening"
  | "captured"
  | "transcribing"
  | "drafting"
  | "guarding"
  | "review"
  | "committing"
  | "remembered"
  | "denied";

export type ProcessingStep =
  | "audio_capture"
  | "transcription"
  | "semantic_draft"
  | "guard"
  | "commit";

export const PROCESSING_ORDER: ProcessingStep[] = [
  "audio_capture",
  "transcription",
  "semantic_draft",
  "guard",
  "commit",
];

export const CONVERSATION_FLOW: { state: ConversationState; label: string; step: ProcessingStep | null }[] = [
  { state: "listening", label: "Listening", step: "audio_capture" },
  { state: "captured", label: "Captured", step: "audio_capture" },
  { state: "transcribing", label: "Transcribing", step: "transcription" },
  { state: "drafting", label: "Extracting", step: "semantic_draft" },
  { state: "guarding", label: "Checking", step: "guard" },
  { state: "committing", label: "Saving", step: "commit" },
  { state: "remembered", label: "Remembered", step: "commit" },
];

export function describeConversationState(state: ConversationState): string {
  switch (state) {
    case "listening": return "The device is listening for a conversation.";
    case "captured": return "Audio was captured and is waiting to be processed.";
    case "transcribing": return "Words are being turned into timestamped text on your device.";
    case "drafting": return "ASK is picking out decisions, actions, and commitments.";
    case "guarding": return "ASK is checking each item against your privacy rules.";
    case "review": return "Something needs your approval before it is remembered.";
    case "committing": return "Saving to local memory.";
    case "remembered": return "This conversation is safely remembered on this device.";
    case "denied": return "This capture was not saved. Nothing was added to memory.";
    default: return "";
  }
}

// A live run over real transcript segments: produces drafts per segment,
// guards each, and commits only the allowed ones. Section 8.3 processing order.
export function runConversationPipeline(input: {
  conversationId: string;
  segments: TranscriptSegment[];
  drafts: SemanticEventDraft[];
  repository: CanonicalEventRepository;
  now?: () => Date;
  onTransition?: (state: ConversationState) => void;
}): { committed: CanonicalEvent[]; reviewed: { draft: SemanticEventDraft; decision: GuardDecision }[]; denied: { draft: SemanticEventDraft; decision: GuardDecision }[] } {
  const now = input.now ?? (() => new Date());
  const transcriptMap = new Map(input.segments.map((segment) => [segment.id, segment]));
  const committed: CanonicalEvent[] = [];
  const reviewed: { draft: SemanticEventDraft; decision: GuardDecision }[] = [];
  const denied: { draft: SemanticEventDraft; decision: GuardDecision }[] = [];

  input.onTransition?.("transcribing");
  input.onTransition?.("drafting");

  for (const draft of input.drafts) {
    // Idempotency: a replay of an already-committed draft returns the existing
    // event exactly once (mirrors processSemanticDraft), never a duplicate.
    const existing = input.repository.findByIdempotencyKey(draft.idempotencyKey);
    if (existing) {
      committed.push(existing);
      continue;
    }

    const decision = evaluateDraft(draft, {
      transcriptSegments: transcriptMap,
      existingIdempotencyKeys: input.repository.idempotencyKeys(),
      now,
    });

    if (decision.outcome === "deny") {
      denied.push({ draft, decision });
      continue;
    }

    if (decision.outcome === "require_review") {
      reviewed.push({ draft, decision });
      continue;
    }

    input.onTransition?.("guarding");
    const event = compileCanonicalEvent(draft, decision, { repository: input.repository, now });
    committed.push(event);
  }

  input.onTransition?.("committing");
  input.onTransition?.("remembered");
  return { committed, reviewed, denied };
}

export function evidenceForSegment(segment: TranscriptSegment): EvidenceSpan {
  return {
    transcriptSegmentId: segment.id,
    startChar: 0,
    endChar: segment.text.length,
    startMs: segment.startMs,
    endMs: segment.endMs,
    quotedText: segment.text,
  };
}
