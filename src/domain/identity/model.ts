export type VoiceProfileStatus =
  | "enrolling"
  | "calibrating"
  | "active"
  | "needs_reenrollment"
  | "deleted";

export type VoiceSampleQualityReason =
  | "too_short"
  | "too_quiet"
  | "too_much_silence"
  | "clipped";

export type PcmAudioSample = {
  id: string;
  samples: Float32Array;
  sampleRate: number;
  channels: 1;
  capturedAt: string;
};

export type VoiceSampleQuality = {
  accepted: boolean;
  durationMs: number;
  rms: number;
  peak: number;
  speechRatio: number;
  clippingRate: number;
  reasons: VoiceSampleQualityReason[];
};

export type SpeakerEmbedding = {
  values: Float32Array;
  dimensions: number;
  l2Normalized: true;
  modelVersion: string;
  preprocessingVersion: string;
  inferenceMs: number;
};

export type VoiceTemplateMetadata = {
  id: string;
  profileId: string;
  dimensions: number;
  sourceDurationMs: number;
  quality: VoiceSampleQuality;
  modelVersion: string;
  preprocessingVersion: string;
  createdAt: string;
};

export type StoredVoiceTemplate = VoiceTemplateMetadata & {
  embedding: Float32Array;
};

export type VoiceProfile = {
  id: string;
  displayName: string;
  owner: boolean;
  status: VoiceProfileStatus;
  modelVersion: string;
  preprocessingVersion: string;
  thresholdProfileId?: string;
  templateIds: string[];
  centroid: Float32Array;
  selfConsistency: number;
  createdAt: string;
  updatedAt: string;
};

export type ThresholdCalibrationMethod = "eer" | "min_dcf" | "bootstrap";

export type ThresholdProfile = {
  id: string;
  modelVersion: string;
  preprocessingVersion: string;
  platform: "ios" | "android" | "cross_platform";
  acceptThreshold: number;
  ambiguityMargin: number;
  method: ThresholdCalibrationMethod;
  metrics: {
    falseAcceptRate?: number;
    falseRejectRate?: number;
    equalErrorRate?: number;
    minDetectionCost?: number;
    targetTrials: number;
    impostorTrials: number;
  };
  evaluationSetId: string;
  createdAt: string;
};

export type SpeakerCandidate = {
  profileId: string;
  displayName: string;
  score: number;
};

export type SpeakerDecision = {
  id: string;
  outcome: "verified" | "unknown" | "ambiguous" | "rejected_quality";
  candidateProfileId?: string;
  cosineScore?: number;
  thresholdProfileId: string;
  alternatives: SpeakerCandidate[];
  modelVersion: string;
  preprocessingVersion: string;
  createdAt: string;
  reasonCode:
    | "MATCH_ACCEPTED"
    | "BELOW_ACCEPT_THRESHOLD"
    | "TOP_CANDIDATES_TOO_CLOSE"
    | "SAMPLE_QUALITY_REJECTED"
    | "THRESHOLD_VERSION_MISMATCH";
};

export type CalibrationTrialLabel = "target" | "impostor";

export type VoiceCalibrationTrial = {
  id: string;
  label: CalibrationTrialLabel;
  score: number;
  profileId: string;
  modelVersion: string;
  preprocessingVersion: string;
  platform: "ios" | "android" | "web";
  sourceDurationMs: number;
  capturedAt: string;
};

export interface SpeakerEmbeddingEngine {
  readonly modelVersion: string;
  readonly preprocessingVersion: string;
  embed(sample: PcmAudioSample): Promise<SpeakerEmbedding>;
}

export interface VoiceProfileRepository {
  listProfiles(): Promise<VoiceProfile[]>;
  getProfile(id: string): Promise<VoiceProfile | undefined>;
  getTemplates(profileId: string): Promise<StoredVoiceTemplate[]>;
  saveProfile(profile: VoiceProfile, templates: StoredVoiceTemplate[]): Promise<void>;
  deleteProfile(id: string): Promise<void>;
}

export interface VoiceCalibrationTrialRepository {
  listTrials(): Promise<VoiceCalibrationTrial[]>;
  saveTrial(trial: VoiceCalibrationTrial): Promise<void>;
  clearTrials(): Promise<void>;
}
