import { TranscriptSegment, SemanticEventDraft, FunctionName, EventType } from "@/domain/model";
import { normalizeRelativeDate } from "@/domain/nlp/dateNormalizer";

export interface SemanticParserOptions {
  referenceDate?: Date;
  minConfidence?: number;
}

/**
 * Extracts candidate semantic event drafts from transcript segments.
 * Uses pattern-matching & intent heuristics with strict boundary provenance.
 */
export function parseTranscriptToDrafts(
  segments: TranscriptSegment[],
  conversationId: string,
  options?: SemanticParserOptions,
): SemanticEventDraft[] {
  const drafts: SemanticEventDraft[] = [];
  const refDate = options?.referenceDate ?? new Date("2026-09-18");

  for (const seg of segments) {
    const text = seg.text.trim();
    const speaker = seg.speakerName ?? "Speaker";

    // 1. Action Pattern: "<Actor> will/should/needs to <action> by <deadline>"
    const actionMatch = text.match(/(.+?)\s+(?:will|should|to|is going to)\s+(prepare|share|send|complete|review|finalize|build)\s+(.+?)(?:\s+by\s+([a-zA-Z0-9\s\-]+))?(\.|$)/i);
    if (actionMatch) {
      const actor = actionMatch[1].trim();
      const verb = actionMatch[2].trim();
      const objectPhrase = actionMatch[3].trim();
      const rawDeadline = actionMatch[4] ? actionMatch[4].trim() : undefined;
      const normalizedDeadline = rawDeadline ? normalizeRelativeDate(rawDeadline, refDate) ?? undefined : undefined;

      const title = `${capitalize(verb)} ${objectPhrase.split(" ").slice(0, 3).join(" ")}`;

      drafts.push({
        id: `draft_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        conversationId,
        proposedType: "action" as EventType,
        proposedFunction: "CREATE_ACTION" as FunctionName,
        fields: {
          title,
          objectText: text,
          actor: actor.toLowerCase() === "i" ? "You" : actor,
          people: [actor.toLowerCase() === "i" ? "You" : actor],
          deadlineAt: normalizedDeadline,
          status: "open",
        },
        parserConfidence: 0.94,
        evidence: [
          {
            transcriptSegmentId: seg.id,
            startChar: 0,
            endChar: text.length,
            startMs: seg.startMs,
            endMs: seg.endMs,
            quotedText: text,
          },
        ],
        parserModelVersion: "ask-semantic-parser/1.0.0",
        warnings: [],
        idempotencyKey: `action:${conversationId}:${seg.id}`,
      });
      continue;
    }

    // 2. Decision Pattern: "agreed/decided to/that..."
    const decisionMatch = text.match(/(?:agreed|decided|concluded|settled)\s+(?:on|that|to)\s+(.+?)(\.|$)/i);
    if (decisionMatch) {
      const decisionContent = decisionMatch[1].trim();
      const title = `Decision: ${decisionContent.split(" ").slice(0, 4).join(" ")}`;

      drafts.push({
        id: `draft_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        conversationId,
        proposedType: "decision" as EventType,
        proposedFunction: "CREATE_DECISION" as FunctionName,
        fields: {
          title,
          objectText: text,
          people: [speaker],
          status: "informational",
        },
        parserConfidence: 0.96,
        evidence: [
          {
            transcriptSegmentId: seg.id,
            startChar: 0,
            endChar: text.length,
            startMs: seg.startMs,
            endMs: seg.endMs,
            quotedText: text,
          },
        ],
        parserModelVersion: "ask-semantic-parser/1.0.0",
        warnings: [],
        idempotencyKey: `decision:${conversationId}:${seg.id}`,
      });
      continue;
    }

    // 3. Commitment Pattern: "I promise/commit/will make sure..."
    const commitmentMatch = text.match(/(?:i promise|i will make sure|i will speak with|let me take care of)\s+(.+?)(\.|$)/i);
    if (commitmentMatch) {
      const commitmentContent = commitmentMatch[1].trim();
      const title = `Commitment: ${commitmentContent.split(" ").slice(0, 4).join(" ")}`;

      drafts.push({
        id: `draft_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        conversationId,
        proposedType: "commitment" as EventType,
        proposedFunction: "CREATE_COMMITMENT" as FunctionName,
        fields: {
          title,
          objectText: text,
          actor: "You",
          people: ["You", speaker !== "You" ? speaker : "Counterparty"],
          status: "open",
        },
        parserConfidence: 0.92,
        evidence: [
          {
            transcriptSegmentId: seg.id,
            startChar: 0,
            endChar: text.length,
            startMs: seg.startMs,
            endMs: seg.endMs,
            quotedText: text,
          },
        ],
        parserModelVersion: "ask-semantic-parser/1.0.0",
        warnings: [],
        idempotencyKey: `commitment:${conversationId}:${seg.id}`,
      });
    }
  }

  return drafts;
}

function capitalize(str: string): string {
  if (!str) return "";
  return str.charAt(0).toUpperCase() + str.slice(1);
}
