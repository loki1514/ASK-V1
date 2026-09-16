import {
  PcmAudioSample,
  SpeakerEmbedding,
  SpeakerEmbeddingEngine,
} from "@/domain/identity/model";
import { l2Normalize } from "@/domain/identity/vectorMath";

/**
 * Exercises the enrollment pipeline before an audited ONNX artifact is bundled.
 * Its vectors are explicitly not biometric-grade and must never label a real speaker.
 */
export class PrototypeFeatureEmbeddingEngine implements SpeakerEmbeddingEngine {
  readonly modelVersion = "prototype-feature-vector/1.0.0-not-biometric";
  readonly preprocessingVersion = "pcm16k-mono-windowed/1.0.0";

  async embed(sample: PcmAudioSample): Promise<SpeakerEmbedding> {
    const startedAt = Date.now();
    const windowCount = 8;
    const features = new Float32Array(windowCount * 4);
    const windowSize = Math.max(1, Math.floor(sample.samples.length / windowCount));

    for (let window = 0; window < windowCount; window += 1) {
      const start = window * windowSize;
      const end = window === windowCount - 1
        ? sample.samples.length
        : Math.min(sample.samples.length, start + windowSize);
      let absoluteSum = 0;
      let squareSum = 0;
      let peak = 0;
      let zeroCrossings = 0;
      for (let index = start; index < end; index += 1) {
        const value = sample.samples[index];
        absoluteSum += Math.abs(value);
        squareSum += value * value;
        peak = Math.max(peak, Math.abs(value));
        if (index > start && Math.sign(value) !== Math.sign(sample.samples[index - 1])) zeroCrossings += 1;
      }
      const length = Math.max(1, end - start);
      const offset = window * 4;
      features[offset] = absoluteSum / length;
      features[offset + 1] = Math.sqrt(squareSum / length);
      features[offset + 2] = peak;
      features[offset + 3] = zeroCrossings / length;
    }

    const values = l2Normalize(features);
    return {
      values,
      dimensions: values.length,
      l2Normalized: true,
      modelVersion: this.modelVersion,
      preprocessingVersion: this.preprocessingVersion,
      inferenceMs: Date.now() - startedAt,
    };
  }
}

