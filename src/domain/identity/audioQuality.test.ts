import { describe, expect, it } from "vitest";
import { analyzeVoiceSample } from "@/domain/identity/audioQuality";
import { PcmAudioSample } from "@/domain/identity/model";

function sample(values: Float32Array, sampleRate = 16_000): PcmAudioSample {
  return {
    id: "sample_1",
    samples: values,
    sampleRate,
    channels: 1,
    capturedAt: "2026-09-15T00:00:00.000Z",
  };
}

describe("analyzeVoiceSample", () => {
  it("accepts a long, audible, unclipped sample", () => {
    const values = Float32Array.from({ length: 16_000 * 9 }, (_, index) => Math.sin(index / 8) * 0.2);
    const quality = analyzeVoiceSample(sample(values));

    expect(quality.accepted).toBe(true);
    expect(quality.durationMs).toBe(9_000);
    expect(quality.reasons).toEqual([]);
  });

  it("reports actionable reasons for an unusable sample", () => {
    const quality = analyzeVoiceSample(sample(new Float32Array(16_000)));

    expect(quality.accepted).toBe(false);
    expect(quality.reasons).toContain("too_short");
    expect(quality.reasons).toContain("too_quiet");
    expect(quality.reasons).toContain("too_much_silence");
  });
});

