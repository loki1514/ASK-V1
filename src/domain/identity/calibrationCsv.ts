import { VoiceCalibrationTrial } from "@/domain/identity/model";

const headers = [
  "label",
  "score",
  "platform",
  "model_version",
  "preprocessing_version",
  "profile_id",
  "source_duration_ms",
  "captured_at",
] as const;

function csvCell(value: string | number): string {
  const text = String(value);
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function serializeCalibrationTrialsCsv(trials: VoiceCalibrationTrial[]): string {
  const rows = trials.map((trial) => [
    trial.label,
    trial.score.toFixed(8),
    trial.platform,
    trial.modelVersion,
    trial.preprocessingVersion,
    trial.profileId,
    Math.round(trial.sourceDurationMs),
    trial.capturedAt,
  ].map(csvCell).join(","));
  return [headers.join(","), ...rows].join("\n");
}
