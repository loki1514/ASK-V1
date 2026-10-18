import Constants from "expo-constants";
import { BUNDLED_SPEAKER_MODEL } from "@/config/voiceModel.native";
import { DEVELOPMENT_THRESHOLD_PROFILE } from "@/config/voiceIdentity";
import { OnnxSpeakerEmbeddingEngine } from "@/infrastructure/inference/onnx/OnnxSpeakerEmbeddingEngine";
import { PrototypeFeatureEmbeddingEngine } from "@/infrastructure/inference/prototype/PrototypeFeatureEmbeddingEngine";
import { SecureStoreVoiceProfileRepository } from "@/infrastructure/secure/SecureStoreVoiceProfileRepository";
import { InMemoryVoiceProfileRepository } from "@/infrastructure/memory/InMemoryVoiceProfileRepository";
import { SecureStoreVoiceCalibrationTrialRepository } from "@/infrastructure/secure/SecureStoreVoiceCalibrationTrialRepository";
import { InMemoryVoiceCalibrationTrialRepository } from "@/infrastructure/memory/InMemoryVoiceCalibrationTrialRepository";
import { VoiceRuntimeDescriptor } from "@/features/voice/runtimeContract";

const isExpoGo = (Constants.appOwnership as string | null) === "ExpoGo";

// Expo Go cannot load native ONNX bindings, so we fall back to the prototype
// engine. A custom development build (expo run:android / EAS Build) uses ONNX.
function createEngine() {
  if (isExpoGo) {
    return new PrototypeFeatureEmbeddingEngine();
  }
  return new OnnxSpeakerEmbeddingEngine(BUNDLED_SPEAKER_MODEL);
}

function createRepositories() {
  if (isExpoGo) {
    return {
      profiles: new InMemoryVoiceProfileRepository(),
      trials: new InMemoryVoiceCalibrationTrialRepository(),
    };
  }
  return {
    profiles: new SecureStoreVoiceProfileRepository(),
    trials: new SecureStoreVoiceCalibrationTrialRepository(),
  };
}

export const voiceEmbeddingEngine = createEngine();
const repos = createRepositories();
export const voiceProfileRepository = repos.profiles;
export const voiceCalibrationTrialRepository = repos.trials;

// Intentionally undefined for ONNX until consented device trials produce a
// release threshold profile. Prototype uses the synthetic bootstrap profile.
export const voiceThresholdProfile = isExpoGo ? DEVELOPMENT_THRESHOLD_PROFILE : undefined;

export const voiceRuntimeDescriptor: VoiceRuntimeDescriptor = isExpoGo
  ? {
      kind: "prototype",
      label: "Expo Go preview · non-biometric",
      verificationEnabled: true,
      calibrationRequired: false,
      captureEnabled: true,
      persistence: "memory",
    }
  : {
      kind: "candidate_onnx",
      label: "ECAPA candidate · calibration required",
      verificationEnabled: false,
      calibrationRequired: true,
      captureEnabled: true,
      persistence: "protected_local",
    };
