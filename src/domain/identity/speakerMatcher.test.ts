import { describe, expect, it } from "vitest";
import { SpeakerEmbedding, ThresholdProfile, VoiceProfile, VoiceSampleQuality } from "@/domain/identity/model";
import { matchSpeaker } from "@/domain/identity/speakerMatcher";
import { l2Normalize } from "@/domain/identity/vectorMath";

const threshold: ThresholdProfile = {
  id: "threshold_1",
  modelVersion: "speaker/1",
  preprocessingVersion: "pcm/1",
  platform: "cross_platform",
  acceptThreshold: 0.8,
  ambiguityMargin: 0.05,
  method: "eer",
  metrics: { targetTrials: 20, impostorTrials: 20 },
  evaluationSetId: "eval_1",
  createdAt: "2026-09-15T00:00:00.000Z",
};

const quality: VoiceSampleQuality = {
  accepted: true,
  durationMs: 10_000,
  rms: 0.1,
  peak: 0.4,
  speechRatio: 0.8,
  clippingRate: 0,
  reasons: [],
};

const embedding = (values: number[]): SpeakerEmbedding => ({
  values: l2Normalize(Float32Array.from(values)),
  dimensions: values.length,
  l2Normalized: true,
  modelVersion: "speaker/1",
  preprocessingVersion: "pcm/1",
  inferenceMs: 12,
});

const profile = (id: string, values: number[]): VoiceProfile => ({
  id,
  displayName: id,
  owner: id === "owner",
  status: "active",
  modelVersion: "speaker/1",
  preprocessingVersion: "pcm/1",
  thresholdProfileId: threshold.id,
  templateIds: [],
  centroid: l2Normalize(Float32Array.from(values)),
  selfConsistency: 0.9,
  createdAt: "2026-09-15T00:00:00.000Z",
  updatedAt: "2026-09-15T00:00:00.000Z",
});

describe("matchSpeaker", () => {
  it("verifies the best candidate above threshold with enough margin", () => {
    const decision = matchSpeaker({
      embedding: embedding([1, 0]),
      quality,
      profiles: [profile("owner", [1, 0]), profile("guest", [0, 1])],
      threshold,
    });

    expect(decision.outcome).toBe("verified");
    expect(decision.candidateProfileId).toBe("owner");
  });

  it("returns unknown below the calibrated threshold", () => {
    const decision = matchSpeaker({
      embedding: embedding([0, 1]),
      quality,
      profiles: [profile("owner", [1, 0])],
      threshold,
    });

    expect(decision.outcome).toBe("unknown");
  });

  it("returns ambiguous when two candidates are too close", () => {
    const decision = matchSpeaker({
      embedding: embedding([1, 0]),
      quality,
      profiles: [profile("owner", [1, 0]), profile("guest", [0.999, 0.01])],
      threshold,
    });

    expect(decision.outcome).toBe("ambiguous");
    expect(decision.candidateProfileId).toBeUndefined();
  });

  it("fails closed when the threshold belongs to another model", () => {
    const decision = matchSpeaker({
      embedding: embedding([1, 0]),
      quality,
      profiles: [profile("owner", [1, 0])],
      threshold: { ...threshold, modelVersion: "speaker/2" },
    });

    expect(decision.outcome).toBe("unknown");
    expect(decision.reasonCode).toBe("THRESHOLD_VERSION_MISMATCH");
    expect(decision.alternatives).toEqual([]);
  });
});
