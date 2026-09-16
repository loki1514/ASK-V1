import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";

export async function exportCalibrationScores(csv: string): Promise<void> {
  const file = new File(Paths.cache, `ask-voice-calibration-${Date.now()}.csv`);
  file.create({ overwrite: true, intermediates: true });
  file.write(csv);
  if (!(await Sharing.isAvailableAsync())) {
    throw new Error("Sharing is not available on this device");
  }
  await Sharing.shareAsync(file.uri, {
    mimeType: "text/csv",
    UTI: "public.comma-separated-values-text",
    dialogTitle: "Export ASK calibration scores",
  });
}
