import { analyzeVoiceSample, VoiceQualityPolicy } from "@/domain/identity/audioQuality";
import {
  PcmAudioSample,
  SpeakerDecision,
  SpeakerEmbeddingEngine,
  ThresholdProfile,
  VoiceProfileRepository,
} from "@/domain/identity/model";
import { matchSpeaker } from "@/domain/identity/speakerMatcher";

export async function verifySpeaker(input: {
  sample: PcmAudioSample;
  engine: SpeakerEmbeddingEngine;
  repository: VoiceProfileRepository;
  thresholdProfile: ThresholdProfile;
  qualityPolicy?: VoiceQualityPolicy;
  now?: () => Date;
}): Promise<SpeakerDecision> {
  const quality = analyzeVoiceSample(input.sample, input.qualityPolicy);
  if (!quality.accepted) {
    return matchSpeaker({
      embedding: {
        values: new Float32Array([1]),
        dimensions: 1,
        l2Normalized: true,
        modelVersion: input.engine.modelVersion,
        preprocessingVersion: input.engine.preprocessingVersion,
        inferenceMs: 0,
      },
      quality,
      profiles: [],
      threshold: input.thresholdProfile,
      now: input.now,
    });
  }

  const [embedding, profiles] = await Promise.all([
    input.engine.embed(input.sample),
    input.repository.listProfiles(),
  ]);

  return matchSpeaker({
    embedding,
    quality,
    profiles,
    threshold: input.thresholdProfile,
    now: input.now,
  });
}

