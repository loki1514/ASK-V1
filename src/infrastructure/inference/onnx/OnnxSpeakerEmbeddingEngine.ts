import {
  PcmAudioSample,
  SpeakerEmbedding,
  SpeakerEmbeddingEngine,
} from "@/domain/identity/model";
import { l2Normalize } from "@/domain/identity/vectorMath";
import { computeWeSpeakerFbank } from "@/infrastructure/inference/preprocessing/weSpeakerFbank";

// onnxruntime-react-native is a native module. Eagerly importing it at the top
// level crashes Expo Go because the native binding is not installed there.
// We load it lazily so the rest of the app can boot and use the prototype
// engine or dev features instead.
let ortModule: typeof import("onnxruntime-react-native") | undefined;

async function getOrt(): Promise<typeof import("onnxruntime-react-native")> {
  if (!ortModule) {
    ortModule = await import("onnxruntime-react-native");
  }
  return ortModule;
}

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
  private session?: unknown;

  constructor(private readonly manifest: OnnxSpeakerModelManifest) {
    this.modelVersion = manifest.modelVersion;
    this.preprocessingVersion = manifest.preprocessingVersion;
  }

  private async getSession(): Promise<unknown> {
    if (!this.session) {
      const ort = await getOrt();
      const InferenceSession = (ort as { InferenceSession: { create: (path: string, opts?: unknown) => Promise<unknown> } }).InferenceSession;
      const modelPath = typeof this.manifest.modelPath === "function"
        ? await this.manifest.modelPath()
        : this.manifest.modelPath;
      this.session = await InferenceSession.create(modelPath, {
        executionMode: "sequential",
        graphOptimizationLevel: "all",
        enableCpuMemArena: true,
      });

      const inputNames = (this.session as { inputNames?: string[] }).inputNames ?? [];
      const outputNames = (this.session as { outputNames?: string[] }).outputNames ?? [];
      if (!inputNames.includes(this.manifest.inputName)) {
        throw new Error(`ONNX model does not expose input ${this.manifest.inputName}`);
      }
      if (!outputNames.includes(this.manifest.outputName)) {
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
    const ort = await getOrt();
    const Tensor = (ort as { Tensor: new (type: string, data: Float32Array, dims: number[]) => unknown }).Tensor;
    const startedAt = Date.now();
    const input = this.makeInput(sample, Tensor);
    const output = await (session as { run: (inputs: Record<string, unknown>) => Promise<Record<string, unknown>> }).run({ [this.manifest.inputName]: input });
    const tensor = output[this.manifest.outputName];
    if (!tensor || !((tensor as { data?: unknown }).data instanceof Float32Array)) {
      throw new Error("Speaker model returned a missing or non-float embedding tensor");
    }

    const values = l2Normalize(new Float32Array((tensor as { data: Float32Array }).data));
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

  private makeInput(sample: PcmAudioSample, Tensor: new (type: string, data: Float32Array, dims: number[]) => unknown): unknown {
    if (this.manifest.inputLayout === "waveform_batch_time") {
      return new Tensor("float32", sample.samples, [1, sample.samples.length]);
    }

    const features = computeWeSpeakerFbank(sample);
    const expectedBins = this.manifest.featureBins ?? 80;
    if (features.bins !== expectedBins) {
      throw new Error(`Speaker model requires ${expectedBins} filterbank bins; received ${features.bins}`);
    }
    return new Tensor("float32", features.values, [1, features.frames, features.bins]);
  }

  async release(): Promise<void> {
    if (this.session) {
      try {
        await (this.session as { release?: () => Promise<void> }).release?.();
      } catch {
        // ignore
      }
      this.session = undefined;
    }
  }
}
