import {
  SpeakerDecision,
  SpeakerEmbedding,
  ThresholdProfile,
  VoiceProfile,
  VoiceSampleQuality,
} from "@/domain/identity/model";
import { cosineSimilarity } from "@/domain/identity/vectorMath";

export function matchSpeaker(input: {
  embedding: SpeakerEmbedding;
  quality: VoiceSampleQuality;
  profiles: VoiceProfile[];
  threshold: ThresholdProfile;
  now?: () => Date;
  makeId?: () => string;
}): SpeakerDecision {
  const createdAt = (input.now?.() ?? new Date()).toISOString();
  const base = {
    id: input.makeId?.() ?? `speaker_decision_${createdAt}`,
    thresholdProfileId: input.threshold.id,
    modelVersion: input.embedding.modelVersion,
    preprocessingVersion: input.embedding.preprocessingVersion,
    createdAt,
  };

  if (!input.quality.accepted) {
    return {
      ...base,
      outcome: "rejected_quality",
      alternatives: [],
      reasonCode: "SAMPLE_QUALITY_REJECTED",
    };
  }

  if (
    input.threshold.modelVersion !== input.embedding.modelVersion ||
    input.threshold.preprocessingVersion !== input.embedding.preprocessingVersion
  ) {
    return {
      ...base,
      outcome: "unknown",
      alternatives: [],
      reasonCode: "THRESHOLD_VERSION_MISMATCH",
    };
  }

  const compatible = input.profiles.filter((profile) =>
    profile.status === "active" &&
    profile.modelVersion === input.embedding.modelVersion &&
    profile.preprocessingVersion === input.embedding.preprocessingVersion &&
    profile.centroid.length === input.embedding.dimensions
  );

  const alternatives = compatible
    .map((profile) => ({
      profileId: profile.id,
      displayName: profile.displayName,
      score: cosineSimilarity(input.embedding.values, profile.centroid),
    }))
    .sort((left, right) => right.score - left.score);

  const top = alternatives[0];
  if (!top || top.score < input.threshold.acceptThreshold) {
    return {
      ...base,
      outcome: "unknown",
      cosineScore: top?.score,
      alternatives: alternatives.slice(0, 3),
      reasonCode: "BELOW_ACCEPT_THRESHOLD",
    };
  }

  const second = alternatives[1];
  if (second && top.score - second.score < input.threshold.ambiguityMargin) {
    return {
      ...base,
      outcome: "ambiguous",
      cosineScore: top.score,
      alternatives: alternatives.slice(0, 3),
      reasonCode: "TOP_CANDIDATES_TOO_CLOSE",
    };
  }

  return {
    ...base,
    outcome: "verified",
    candidateProfileId: top.profileId,
    cosineScore: top.score,
    alternatives: alternatives.slice(0, 3),
    reasonCode: "MATCH_ACCEPTED",
  };
}
