import { SpeakerEmbeddingEngine, ThresholdProfile, VoiceProfileRepository } from "@/domain/identity/model";

export type VoiceRuntimeDescriptor = {
  kind: "prototype" | "candidate_onnx";
  label: string;
  verificationEnabled: boolean;
  calibrationRequired: boolean;
  captureEnabled: boolean;
  persistence: "protected_local" | "memory";
};

export type VoiceRuntime = {
  voiceEmbeddingEngine: SpeakerEmbeddingEngine;
  voiceProfileRepository: VoiceProfileRepository;
  voiceThresholdProfile?: ThresholdProfile;
  voiceRuntimeDescriptor: VoiceRuntimeDescriptor;
};
