import { ParsedConversation, SemanticEventDraft, TranscriptSegment } from "@/domain/model";

export interface TranscriptParser {
  parse(transcript: string, source?: ParsedConversation["source"]): Promise<ParsedConversation>;
}

export interface SemanticParser {
  extract(segments: TranscriptSegment[]): Promise<SemanticEventDraft[]>;
}

