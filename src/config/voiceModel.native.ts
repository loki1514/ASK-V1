import { Asset } from "expo-asset";
import { OnnxSpeakerModelManifest } from "@/infrastructure/inference/onnx/OnnxSpeakerEmbeddingEngine";

const modelModule = require("../../models/voxceleb_ECAPA512.onnx");

async function resolveBundledModelPath(): Promise<string> {
  const [asset] = await Asset.loadAsync(modelModule);
  const path = asset.localUri ?? asset.uri;
  if (!path) throw new Error("Bundled ECAPA model has no readable local URI");
  return path;
}

export const BUNDLED_SPEAKER_MODEL: OnnxSpeakerModelManifest = {
  modelVersion: "wespeaker-voxceleb-ecapa-tdnn512/89426e111abc9ffcc40279baf808e087693c6e9b",
  preprocessingVersion: "wespeaker-kaldi-fbank80-cmn/1.0.0",
  modelPath: resolveBundledModelPath,
  inputName: "feats",
  outputName: "embs",
  expectedSampleRate: 16_000,
  expectedDimensions: 192,
  inputLayout: "fbank_batch_time_features",
  featureBins: 80,
  sha256: "f901ae3571912bad4e11e157744cb8b7d77a0b46923b83c410bdbb6c77d69736",
  license: "Apache-2.0; pretrained VoxCeleb weights subject to CC BY 4.0 attribution",
};
