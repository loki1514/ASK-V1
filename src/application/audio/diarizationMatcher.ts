import { VoiceProfile } from "@/domain/identity/model";
import { cosineSimilarity } from "@/domain/identity/vectorMath";
import { TranscriptSegment } from "@/domain/model";

export interface SpeakerTurn {
  speakerTag: string; // e.g., "Speaker_0", "Speaker_1"
  startMs: number;
  endMs: number;
  embedding?: number[];
  text: string;
}

export interface DiarizationMatchResult {
  segment: TranscriptSegment;
  matchedProfileId?: string;
  matchedProfileName: string;
  cosineScore: number;
  confidence: "high" | "medium" | "low" | "unassigned";
}

/**
 * Maps anonymous diarized speaker turns to registered Voice Profiles using
 * unit-normalized cosine similarity matching against centroid templates.
 */
export function matchSpeakerTurnToProfiles(
  turn: SpeakerTurn,
  profiles: VoiceProfile[],
  matchThreshold: number = 0.70,
  ambiguityMargin: number = 0.05,
): DiarizationMatchResult {
  const segment: TranscriptSegment = {
    id: `seg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    conversationId: "live",
    speakerName: turn.speakerTag,
    text: turn.text,
    startMs: turn.startMs,
    endMs: turn.endMs,
    confidence: 0.90,
  };

  if (!turn.embedding || profiles.length === 0) {
    return {
      segment,
      matchedProfileName: turn.speakerTag,
      cosineScore: 0,
      confidence: "unassigned",
    };
  }

  const turnVec = new Float32Array(turn.embedding);

  // Calculate cosine scores across all profiles
  const scored = profiles
    .map((profile) => ({
      profile,
      score: cosineSimilarity(turnVec, new Float32Array(profile.centroid)),
    }))
    .sort((a, b) => b.score - a.score);

  const best = scored[0];
  const second = scored[1];

  if (!best || best.score < matchThreshold) {
    return {
      segment,
      matchedProfileName: turn.speakerTag,
      cosineScore: best ? best.score : 0,
      confidence: "low",
    };
  }

  // Ambiguity check: if 2nd profile is within ambiguity margin, flag as ambiguous
  if (second && best.score - second.score < ambiguityMargin) {
    return {
      segment,
      matchedProfileId: best.profile.id,
      matchedProfileName: best.profile.displayName,
      cosineScore: best.score,
      confidence: "medium",
    };
  }

  // Confident match: update segment speaker name and resolved id
  segment.resolvedSpeakerId = best.profile.id;
  segment.speakerName = best.profile.displayName;

  return {
    segment,
    matchedProfileId: best.profile.id,
    matchedProfileName: best.profile.displayName,
    cosineScore: best.score,
    confidence: "high",
  };
}
