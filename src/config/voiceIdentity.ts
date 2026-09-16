import { ThresholdProfile } from "@/domain/identity/model";

/** Synthetic bootstrap profile. It keeps product states testable but cannot ship as biometric calibration. */
export const DEVELOPMENT_THRESHOLD_PROFILE: ThresholdProfile = {
  id: "threshold.prototype.synthetic.v1",
  modelVersion: "prototype-feature-vector/1.0.0-not-biometric",
  preprocessingVersion: "pcm16k-mono-windowed/1.0.0",
  platform: "cross_platform",
  acceptThreshold: 0.86,
  ambiguityMargin: 0.04,
  method: "bootstrap",
  metrics: {
    targetTrials: 0,
    impostorTrials: 0,
  },
  evaluationSetId: "synthetic-placeholder-not-release-calibration",
  createdAt: "2026-09-15T00:00:00.000Z",
};

