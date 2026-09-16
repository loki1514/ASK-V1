import { DEVELOPMENT_THRESHOLD_PROFILE } from "@/config/voiceIdentity";
import { PrototypeFeatureEmbeddingEngine } from "@/infrastructure/inference/prototype/PrototypeFeatureEmbeddingEngine";
import { InMemoryVoiceProfileRepository } from "@/infrastructure/memory/InMemoryVoiceProfileRepository";
import { InMemoryVoiceCalibrationTrialRepository } from "@/infrastructure/memory/InMemoryVoiceCalibrationTrialRepository";
import { VoiceRuntimeDescriptor } from "@/features/voice/runtimeContract";

export const voiceEmbeddingEngine = new PrototypeFeatureEmbeddingEngine();
export const voiceProfileRepository = new InMemoryVoiceProfileRepository();
export const voiceCalibrationTrialRepository = new InMemoryVoiceCalibrationTrialRepository();
export const voiceThresholdProfile = DEVELOPMENT_THRESHOLD_PROFILE;
export const voiceRuntimeDescriptor: VoiceRuntimeDescriptor = {
  kind: "prototype",
  label: "Interactive preview · non-biometric",
  verificationEnabled: true,
  calibrationRequired: false,
  captureEnabled: false,
  persistence: "memory",
};
