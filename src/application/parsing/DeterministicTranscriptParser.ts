import { ParsedConversation, Speaker, TranscriptSegment } from "@/domain/model";
import { TranscriptParser } from "@/application/parsing/contracts";

const timestampPattern = /^\[?(\d{1,2}):(\d{2})(?::(\d{2}))?\]?\s*(.*)$/;
const speakerPattern = /^(SPEAKER[ _-]?[A-Z0-9]+)\s*(?:[:\-–—]\s*)?(.*)$/i;

function msFromTimestamp(a: string, b: string, c?: string): number {
  const hours = c ? Number(a) : 0;
  const minutes = c ? Number(b) : Number(a);
  const seconds = c ? Number(c) : Number(b);
  return ((hours * 60 + minutes) * 60 + seconds) * 1000;
}

function normalizedSpeakerId(sourceLabel: string, speakerIndex: Map<string, number>): string {
  const key = sourceLabel.toUpperCase().replace(/[^A-Z0-9]/g, "_");
  if (!speakerIndex.has(key)) speakerIndex.set(key, speakerIndex.size + 1);
  return `speaker_${speakerIndex.get(key)}`;
}

export class DeterministicTranscriptParser implements TranscriptParser {
  async parse(transcript: string, source: ParsedConversation["source"] = "pasted"): Promise<ParsedConversation> {
    return this.parseSync(transcript, source);
  }

  parseSync(transcript: string, source: ParsedConversation["source"] = "pasted"): ParsedConversation {
    const lines = transcript.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    const speakerIndex = new Map<string, number>();
    const raw: Array<{ startMs: number; sourceSpeaker?: string; text: string }> = [];

    for (let i = 0; i < lines.length; i += 1) {
      const match = lines[i].match(timestampPattern);
      if (!match) continue;
      const startMs = msFromTimestamp(match[1], match[2], match[3]);
      let remainder = match[4].trim();
      let sourceSpeaker: string | undefined;
      let text = "";

      const inline = remainder.match(speakerPattern);
      if (inline) {
        sourceSpeaker = inline[1];
        text = inline[2].trim();
      } else if (remainder) {
        text = remainder;
      }

      if (!text && lines[i + 1] && !timestampPattern.test(lines[i + 1])) {
        const next = lines[i + 1].match(speakerPattern);
        if (next) {
          sourceSpeaker = next[1];
          text = next[2].trim();
          if (!text && lines[i + 2] && !timestampPattern.test(lines[i + 2])) {
            text = lines[i + 2];
            i += 1;
          }
        } else {
          text = lines[i + 1];
        }
        i += 1;
      }

      if (!sourceSpeaker) sourceSpeaker = `UNNAMED_${raw.length % 2}`;
      if (text) raw.push({ startMs, sourceSpeaker, text });
    }

    const conversationId = `conversation_bangalore_${source}`;
    const segments: TranscriptSegment[] = raw.map((item, index) => {
      const nextStart = raw[index + 1]?.startMs;
      const endMs = nextStart ? Math.max(item.startMs + 900, nextStart - 250) : item.startMs + Math.max(1800, item.text.length * 48);
      const anonymousSpeakerId = normalizedSpeakerId(item.sourceSpeaker ?? `UNNAMED_${index}`, speakerIndex);
      return {
        id: `${conversationId}_segment_${String(index + 1).padStart(2, "0")}`,
        conversationId,
        startMs: item.startMs,
        endMs,
        text: item.text,
        speakerName: item.sourceSpeaker,
        anonymousSpeakerId,
        confidence: source === "dirty" ? 0.91 : 0.99,
      };
    });

    const speakers: Speaker[] = [...speakerIndex.entries()].map(([sourceLabel, index]) => ({
      id: `speaker_${index}`,
      label: `Speaker ${index}`,
      sourceLabel: sourceLabel.replace(/_/g, " "),
      identityStatus: "unresolved",
    }));

    return { id: conversationId, title: "Bangalore Project", source, segments, speakers, events: [] };
  }
}

