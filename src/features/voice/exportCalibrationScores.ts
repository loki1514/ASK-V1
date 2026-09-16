import { Share } from "react-native";

export async function exportCalibrationScores(csv: string): Promise<void> {
  await Share.share({ title: "ASK voice calibration scores", message: csv });
}
