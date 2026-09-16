import { describe, expect, it } from "vitest";
import { PcmAudioSample } from "@/domain/identity/model";
import { computeWeSpeakerFbank } from "./weSpeakerFbank";

const REFERENCE_ANCHORS: Record<string, number> = {
  "0:0": 1.5118789673,
  "0:1": 2.8681354523,
  "0:7": -0.0136756897,
  "0:19": -0.7032003403,
  "0:40": 0.2782211304,
  "0:63": 0.3605337143,
  "0:79": 0.443066597,
  "1:0": -1.274851799,
  "1:1": 2.0068721771,
  "1:7": -0.0156478882,
  "1:19": -0.7997350693,
  "1:40": 0.1476182938,
  "1:63": 0.1622152328,
  "1:79": 0.1968107224,
  "17:0": 0.9942893982,
  "17:1": 0.5394153595,
  "17:7": 0.000459671,
  "17:19": -0.5433254242,
  "17:40": -1.6547164917,
  "17:63": -2.0651712418,
  "17:79": -3.0479369164,
  "53:0": -0.2092189789,
  "53:1": 0.2212753296,
  "53:7": -0.0113620758,
  "53:19": -0.5233726501,
  "53:40": 0.6476888657,
  "53:63": 0.6492366791,
  "53:79": 0.6943426132,
  "97:0": 0.794626236,
  "97:1": -0.1083192825,
  "97:7": -0.002872467,
  "97:19": -0.5560808182,
  "97:40": 0.3635511398,
  "97:63": -1.5519256592,
  "97:79": -1.4939279556,
};

export function makeReferenceWaveform(): PcmAudioSample {
  const sampleRate = 16_000;
  const samples = new Float32Array(sampleRate);
  for (let index = 0; index < samples.length; index += 1) {
    const time = index / sampleRate;
    let value = (
      0.32 * Math.sin(2 * Math.PI * 220 * time) +
      0.14 * Math.sin(2 * Math.PI * 730 * time) +
      0.05 * Math.sin(2 * Math.PI * (100 * time + 700 * time * time)) +
      0.013
    );
    if (index === 4_000) value += 0.2;
    if (index === 9_000) value -= 0.2;
    samples[index] = value;
  }
  return {
    id: "torchaudio-kaldi-reference-v1",
    samples,
    sampleRate,
    channels: 1,
    capturedAt: "2026-09-15T00:00:00.000Z",
  };
}

describe("computeWeSpeakerFbank", () => {
  it("matches torchaudio Kaldi reference anchors", () => {
    const features = computeWeSpeakerFbank(makeReferenceWaveform());
    expect(features.frames).toBe(98);
    expect(features.bins).toBe(80);

    for (const [coordinate, expected] of Object.entries(REFERENCE_ANCHORS)) {
      const [frame, bin] = coordinate.split(":").map(Number);
      expect(features.values[frame * features.bins + bin]).toBeCloseTo(expected, 3);
    }
  });

  it("applies per-recording cepstral mean normalization", () => {
    const features = computeWeSpeakerFbank(makeReferenceWaveform());
    for (let bin = 0; bin < features.bins; bin += 1) {
      let mean = 0;
      for (let frame = 0; frame < features.frames; frame += 1) {
        mean += features.values[frame * features.bins + bin];
      }
      expect(mean / features.frames).toBeCloseTo(0, 5);
    }
  });
});
