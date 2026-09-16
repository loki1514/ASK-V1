import { BUNDLED_SPEAKER_MODEL } from "@/config/voiceModel.native";
import { OnnxSpeakerEmbeddingEngine } from "@/infrastructure/inference/onnx/OnnxSpeakerEmbeddingEngine";
import { SecureStoreVoiceProfileRepository } from "@/infrastructure/secure/SecureStoreVoiceProfileRepository";
import { SecureStoreVoiceCalibrationTrialRepository } from "@/infrastructure/secure/SecureStoreVoiceCalibrationTrialRepository";
import { VoiceRuntimeDescriptor } from "@/features/voice/runtimeContract";

export const voiceEmbeddingEngine = new OnnxSpeakerEmbeddingEngine(BUNDLED_SPEAKER_MODEL);
export const voiceProfileRepository = new SecureStoreVoiceProfileRepository();
export const voiceCalibrationTrialRepository = new SecureStoreVoiceCalibrationTrialRepository();

// Intentionally undefined until consented device trials produce a release threshold profile.
export const voiceThresholdProfile = undefined;

export const voiceRuntimeDescriptor: VoiceRuntimeDescriptor = {
  kind: "candidate_onnx",
  label: "ECAPA candidate · calibration required",
  verificationEnabled: false,
  calibrationRequired: true,
  captureEnabled: true,
  persistence: "protected_local",
};
