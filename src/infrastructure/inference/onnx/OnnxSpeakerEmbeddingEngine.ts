import * as ort from "onnxruntime-react-native";
import {
  PcmAudioSample,
  SpeakerEmbedding,
  SpeakerEmbeddingEngine,
} from "@/domain/identity/model";
import { l2Normalize } from "@/domain/identity/vectorMath";
import { computeWeSpeakerFbank } from "@/infrastructure/inference/preprocessing/weSpeakerFbank";

export type OnnxModelPath = string | (() => Promise<string>);

export type OnnxSpeakerModelManifest = {
  modelVersion: string;
  preprocessingVersion: string;
  modelPath: OnnxModelPath;
  inputName: string;
  outputName: string;
  expectedSampleRate: number;
  expectedDimensions: number;
  inputLayout: "waveform_batch_time" | "fbank_batch_time_features";
  featureBins?: number;
  sha256?: string;
  license?: string;
};

export class OnnxSpeakerEmbeddingEngine implements SpeakerEmbeddingEngine {
  readonly modelVersion: string;
  readonly preprocessingVersion: string;
  private session?: ort.InferenceSession;

  constructor(private readonly manifest: OnnxSpeakerModelManifest) {
    this.modelVersion = manifest.modelVersion;
    this.preprocessingVersion = manifest.preprocessingVersion;
  }

  private async getSession(): Promise<ort.InferenceSession> {
    if (!this.session) {
      const modelPath = typeof this.manifest.modelPath === "function"
        ? await this.manifest.modelPath()
        : this.manifest.modelPath;
      this.session = await ort.InferenceSession.create(modelPath, {
        executionMode: "sequential",
        graphOptimizationLevel: "all",
        enableCpuMemArena: true,
      });

      if (!this.session.inputNames.includes(this.manifest.inputName)) {
        throw new Error(`ONNX model does not expose input ${this.manifest.inputName}`);
      }
      if (!this.session.outputNames.includes(this.manifest.outputName)) {
        throw new Error(`ONNX model does not expose output ${this.manifest.outputName}`);
      }
    }
    return this.session;
  }

  async embed(sample: PcmAudioSample): Promise<SpeakerEmbedding> {
    if (sample.channels !== 1) throw new Error("Speaker model requires mono PCM");
    if (sample.sampleRate !== this.manifest.expectedSampleRate) {
      throw new Error(
        `Speaker model requires ${this.manifest.expectedSampleRate} Hz PCM; received ${sample.sampleRate} Hz`,
      );
    }

    const session = await this.getSession();
    const startedAt = Date.now();
    const input = this.makeInput(sample);
    const output = await session.run({ [this.manifest.inputName]: input });
    const tensor = output[this.manifest.outputName];
    if (!tensor || !(tensor.data instanceof Float32Array)) {
      throw new Error("Speaker model returned a missing or non-float embedding tensor");
    }

    const values = l2Normalize(new Float32Array(tensor.data));
    if (values.length !== this.manifest.expectedDimensions) {
      throw new Error(
        `Speaker model returned ${values.length} dimensions; expected ${this.manifest.expectedDimensions}`,
      );
    }

    return {
      values,
      dimensions: values.length,
      l2Normalized: true,
      modelVersion: this.modelVersion,
      preprocessingVersion: this.preprocessingVersion,
      inferenceMs: Date.now() - startedAt,
    };
  }

  private makeInput(sample: PcmAudioSample): ort.Tensor {
    if (this.manifest.inputLayout === "waveform_batch_time") {
      return new ort.Tensor("float32", sample.samples, [1, sample.samples.length]);
    }

    const features = computeWeSpeakerFbank(sample);
    const expectedBins = this.manifest.featureBins ?? 80;
    if (features.bins !== expectedBins) {
      throw new Error(`Speaker model requires ${expectedBins} filterbank bins; received ${features.bins}`);
    }
    return new ort.Tensor("float32", features.values, [1, features.frames, features.bins]);
  }

  async release(): Promise<void> {
    await this.session?.release();
    this.session = undefined;
  }
}
