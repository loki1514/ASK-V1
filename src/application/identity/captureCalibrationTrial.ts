import { analyzeVoiceSample, VoiceQualityPolicy } from "@/domain/identity/audioQuality";
import {
  CalibrationTrialLabel,
  PcmAudioSample,
  SpeakerEmbeddingEngine,
  VoiceCalibrationTrial,
  VoiceCalibrationTrialRepository,
  VoiceProfileRepository,
} from "@/domain/identity/model";
import { cosineSimilarity } from "@/domain/identity/vectorMath";

export class CalibrationTrialError extends Error {
  constructor(
    message: string,
    readonly code: "SAMPLE_QUALITY_REJECTED" | "PROFILE_MISSING" | "MODEL_VERSION_MISMATCH",
  ) {
    super(message);
    this.name = "CalibrationTrialError";
  }
}

export async function captureCalibrationTrial(input: {
  label: CalibrationTrialLabel;
  sample: PcmAudioSample;
  engine: SpeakerEmbeddingEngine;
  profiles: VoiceProfileRepository;
  trials: VoiceCalibrationTrialRepository;
  platform: VoiceCalibrationTrial["platform"];
  qualityPolicy?: VoiceQualityPolicy;
  now?: () => Date;
}): Promise<VoiceCalibrationTrial> {
  const quality = analyzeVoiceSample(input.sample, input.qualityPolicy);
  if (!quality.accepted) {
    throw new CalibrationTrialError("Calibration sample did not pass audio-quality checks", "SAMPLE_QUALITY_REJECTED");
  }

  const profile = (await input.profiles.listProfiles()).find((candidate) => candidate.owner);
  if (!profile) throw new CalibrationTrialError("Enroll the owner profile first", "PROFILE_MISSING");
  if (
    profile.modelVersion !== input.engine.modelVersion ||
    profile.preprocessingVersion !== input.engine.preprocessingVersion
  ) {
    throw new CalibrationTrialError(
      "The enrolled profile was created by a different model or preprocessing version",
      "MODEL_VERSION_MISMATCH",
    );
  }

  const embedding = await input.engine.embed(input.sample);
  const capturedAt = (input.now?.() ?? new Date()).toISOString();
  const trial: VoiceCalibrationTrial = {
    id: `voice_trial_${capturedAt}_${input.label}`,
    label: input.label,
    score: cosineSimilarity(embedding.values, profile.centroid),
    profileId: profile.id,
    modelVersion: embedding.modelVersion,
    preprocessingVersion: embedding.preprocessingVersion,
    platform: input.platform,
    sourceDurationMs: quality.durationMs,
    capturedAt,
  };
  await input.trials.saveTrial(trial);
  return trial;
}
