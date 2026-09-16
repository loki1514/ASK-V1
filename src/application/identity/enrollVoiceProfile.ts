import { analyzeVoiceSample, VoiceQualityPolicy } from "@/domain/identity/audioQuality";
import {
  PcmAudioSample,
  SpeakerEmbeddingEngine,
  StoredVoiceTemplate,
  ThresholdProfile,
  VoiceProfile,
  VoiceProfileRepository,
  VoiceSampleQuality,
} from "@/domain/identity/model";
import { embeddingCentroid, minimumPairwiseSimilarity } from "@/domain/identity/vectorMath";

export type EnrollmentSampleResult = {
  sampleId: string;
  quality: VoiceSampleQuality;
  templateId?: string;
};

export type EnrollmentResult = {
  profile: VoiceProfile;
  samples: EnrollmentSampleResult[];
};

export class VoiceEnrollmentError extends Error {
  constructor(
    message: string,
    readonly code: "NOT_ENOUGH_ACCEPTED_SAMPLES" | "INCONSISTENT_SAMPLES" | "THRESHOLD_VERSION_MISMATCH",
  ) {
    super(message);
    this.name = "VoiceEnrollmentError";
  }
}

export async function enrollVoiceProfile(input: {
  profileId: string;
  displayName: string;
  owner: boolean;
  samples: PcmAudioSample[];
  engine: SpeakerEmbeddingEngine;
  repository: VoiceProfileRepository;
  thresholdProfile?: ThresholdProfile;
  qualityPolicy?: VoiceQualityPolicy;
  minimumAcceptedSamples?: number;
  minimumSelfConsistency?: number;
  now?: () => Date;
}): Promise<EnrollmentResult> {
  if (
    input.thresholdProfile &&
    (input.thresholdProfile.modelVersion !== input.engine.modelVersion ||
      input.thresholdProfile.preprocessingVersion !== input.engine.preprocessingVersion)
  ) {
    throw new VoiceEnrollmentError(
      "The threshold profile is not compatible with this model and preprocessing version",
      "THRESHOLD_VERSION_MISMATCH",
    );
  }

  const now = input.now?.() ?? new Date();
  const sampleResults: EnrollmentSampleResult[] = [];
  const templates: StoredVoiceTemplate[] = [];

  for (const sample of input.samples) {
    const quality = analyzeVoiceSample(sample, input.qualityPolicy);
    if (!quality.accepted) {
      sampleResults.push({ sampleId: sample.id, quality });
      continue;
    }

    const embedding = await input.engine.embed(sample);
    const templateId = `${input.profileId}.${sample.id}`;
    templates.push({
      id: templateId,
      profileId: input.profileId,
      dimensions: embedding.dimensions,
      sourceDurationMs: quality.durationMs,
      quality,
      modelVersion: embedding.modelVersion,
      preprocessingVersion: embedding.preprocessingVersion,
      createdAt: now.toISOString(),
      embedding: embedding.values,
    });
    sampleResults.push({ sampleId: sample.id, quality, templateId });
  }

  if (templates.length < (input.minimumAcceptedSamples ?? 3)) {
    throw new VoiceEnrollmentError(
      `Enrollment requires at least ${input.minimumAcceptedSamples ?? 3} accepted samples`,
      "NOT_ENOUGH_ACCEPTED_SAMPLES",
    );
  }

  const embeddings = templates.map((template) => template.embedding);
  const selfConsistency = minimumPairwiseSimilarity(embeddings);
  if (selfConsistency < (input.minimumSelfConsistency ?? 0.65)) {
    throw new VoiceEnrollmentError(
      "Enrollment samples are not mutually consistent enough to create a voice profile",
      "INCONSISTENT_SAMPLES",
    );
  }

  const profile: VoiceProfile = {
    id: input.profileId,
    displayName: input.displayName.trim(),
    owner: input.owner,
    status: input.thresholdProfile ? "active" : "calibrating",
    modelVersion: input.engine.modelVersion,
    preprocessingVersion: input.engine.preprocessingVersion,
    thresholdProfileId: input.thresholdProfile?.id,
    templateIds: templates.map((template) => template.id),
    centroid: embeddingCentroid(embeddings),
    selfConsistency,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };

  await input.repository.saveProfile(profile, templates);
  return { profile, samples: sampleResults };
}
