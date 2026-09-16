import { describe, expect, it } from "vitest";
import { captureCalibrationTrial } from "@/application/identity/captureCalibrationTrial";
import { PcmAudioSample } from "@/domain/identity/model";
import { PrototypeFeatureEmbeddingEngine } from "@/infrastructure/inference/prototype/PrototypeFeatureEmbeddingEngine";
import { InMemoryVoiceCalibrationTrialRepository } from "@/infrastructure/memory/InMemoryVoiceCalibrationTrialRepository";
import { InMemoryVoiceProfileRepository } from "@/infrastructure/memory/InMemoryVoiceProfileRepository";
import { enrollVoiceProfile } from "@/application/identity/enrollVoiceProfile";

const sample = (id: string, phase = 0): PcmAudioSample => ({
  id,
  samples: Float32Array.from({ length: 16_000 * 9 }, (_, index) => Math.sin(index / 8 + phase) * 0.2),
  sampleRate: 16_000,
  channels: 1,
  capturedAt: "2026-09-16T00:00:00.000Z",
});

describe("captureCalibrationTrial", () => {
  it("stores score metadata without retaining raw audio or embeddings", async () => {
    const profiles = new InMemoryVoiceProfileRepository();
    const trials = new InMemoryVoiceCalibrationTrialRepository();
    const engine = new PrototypeFeatureEmbeddingEngine();
    await enrollVoiceProfile({
      profileId: "owner",
      displayName: "You",
      owner: true,
      samples: [sample("one"), sample("two", 0.1), sample("three", 0.2)],
      engine,
      repository: profiles,
    });

    const trial = await captureCalibrationTrial({
      label: "target",
      sample: sample("probe", 0.3),
      engine,
      profiles,
      trials,
      platform: "ios",
      now: () => new Date("2026-09-16T10:00:00.000Z"),
    });

    expect(trial.label).toBe("target");
    expect(trial.score).toBeGreaterThan(0.9);
    expect(await trials.listTrials()).toEqual([trial]);
    expect(Object.keys(trial)).not.toContain("samples");
    expect(Object.keys(trial)).not.toContain("embedding");
  });
});
