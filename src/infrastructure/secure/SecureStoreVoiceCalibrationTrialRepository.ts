import * as SecureStore from "expo-secure-store";
import {
  VoiceCalibrationTrial,
  VoiceCalibrationTrialRepository,
} from "@/domain/identity/model";

const TRIALS_KEY = "ask.voice.calibration_trials.v1";
const MAX_LOCAL_TRIALS = 500;
const options: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
};

export class SecureStoreVoiceCalibrationTrialRepository implements VoiceCalibrationTrialRepository {
  async listTrials(): Promise<VoiceCalibrationTrial[]> {
    const value = await SecureStore.getItemAsync(TRIALS_KEY, options);
    if (!value) return [];
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed as VoiceCalibrationTrial[] : [];
  }

  async saveTrial(trial: VoiceCalibrationTrial): Promise<void> {
    const current = await this.listTrials();
    const next = [...current.filter((item) => item.id !== trial.id), trial].slice(-MAX_LOCAL_TRIALS);
    await SecureStore.setItemAsync(TRIALS_KEY, JSON.stringify(next), options);
  }

  async clearTrials(): Promise<void> {
    await SecureStore.deleteItemAsync(TRIALS_KEY, options);
  }
}
