import { describe, expect, it } from "vitest";
import { serializeCalibrationTrialsCsv } from "@/domain/identity/calibrationCsv";

describe("serializeCalibrationTrialsCsv", () => {
  it("exports stable, calibration-script-compatible columns", () => {
    const csv = serializeCalibrationTrialsCsv([{
      id: "trial-1",
      label: "target",
      score: 0.8123456789,
      profileId: "owner,one",
      modelVersion: "ecapa-1",
      preprocessingVersion: "fbank-1",
      platform: "ios",
      sourceDurationMs: 8_234.4,
      capturedAt: "2026-09-16T09:00:00.000Z",
    }]);

    expect(csv.split("\n")[0]).toBe(
      "label,score,platform,model_version,preprocessing_version,profile_id,source_duration_ms,captured_at",
    );
    expect(csv).toContain('target,0.81234568,ios,ecapa-1,fbank-1,"owner,one",8234,2026-09-16T09:00:00.000Z');
  });
});
