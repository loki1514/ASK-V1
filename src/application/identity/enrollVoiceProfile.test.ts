import { describe, expect, it } from "vitest";
import { enrollVoiceProfile, VoiceEnrollmentError } from "@/application/identity/enrollVoiceProfile";
import { DEVELOPMENT_THRESHOLD_PROFILE } from "@/config/voiceIdentity";
import { PcmAudioSample } from "@/domain/identity/model";
import { PrototypeFeatureEmbeddingEngine } from "@/infrastructure/inference/prototype/PrototypeFeatureEmbeddingEngine";
import { InMemoryVoiceProfileRepository } from "@/infrastructure/memory/InMemoryVoiceProfileRepository";

const goodSample = (id: string, phase = 0): PcmAudioSample => ({
  id,
  samples: Float32Array.from(
    { length: 16_000 * 9 },
    (_, index) => Math.sin(index / 8 + phase) * 0.2,
  ),
  sampleRate: 16_000,
  channels: 1,
  capturedAt: "2026-09-15T00:00:00.000Z",
});

describe("enrollVoiceProfile", () => {
  it("stores an active profile after three accepted, consistent samples", async () => {
    const repository = new InMemoryVoiceProfileRepository();
    const result = await enrollVoiceProfile({
      profileId: "owner",
      displayName: "You",
      owner: true,
      samples: [goodSample("one"), goodSample("two", 0.1), goodSample("three", 0.2)],
      engine: new PrototypeFeatureEmbeddingEngine(),
      repository,
      thresholdProfile: DEVELOPMENT_THRESHOLD_PROFILE,
      now: () => new Date("2026-09-15T00:00:00.000Z"),
    });

    expect(result.profile.status).toBe("active");
    expect(result.profile.templateIds).toHaveLength(3);
    expect(await repository.getTemplates("owner")).toHaveLength(3);
  });

  it("refuses to enroll when fewer than three samples pass quality checks", async () => {
    const repository = new InMemoryVoiceProfileRepository();
    const quietSample: PcmAudioSample = {
      ...goodSample("quiet"),
      samples: new Float32Array(16_000 * 9),
    };

    await expect(enrollVoiceProfile({
      profileId: "owner",
      displayName: "You",
      owner: true,
      samples: [goodSample("one"), quietSample, quietSample],
      engine: new PrototypeFeatureEmbeddingEngine(),
      repository,
    })).rejects.toMatchObject({ code: "NOT_ENOUGH_ACCEPTED_SAMPLES" } satisfies Partial<VoiceEnrollmentError>);
  });

  it("fails closed when the threshold belongs to another model", async () => {
    await expect(enrollVoiceProfile({
      profileId: "owner",
      displayName: "You",
      owner: true,
      samples: [goodSample("one"), goodSample("two"), goodSample("three")],
      engine: new PrototypeFeatureEmbeddingEngine(),
      repository: new InMemoryVoiceProfileRepository(),
      thresholdProfile: { ...DEVELOPMENT_THRESHOLD_PROFILE, modelVersion: "another-model" },
    })).rejects.toMatchObject({ code: "THRESHOLD_VERSION_MISMATCH" });
  });
});
