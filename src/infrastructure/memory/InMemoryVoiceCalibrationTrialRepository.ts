import {
  VoiceCalibrationTrial,
  VoiceCalibrationTrialRepository,
} from "@/domain/identity/model";

export class InMemoryVoiceCalibrationTrialRepository implements VoiceCalibrationTrialRepository {
  private trials: VoiceCalibrationTrial[] = [];

  async listTrials(): Promise<VoiceCalibrationTrial[]> {
    return this.trials.map((trial) => ({ ...trial }));
  }

  async saveTrial(trial: VoiceCalibrationTrial): Promise<void> {
    this.trials = [...this.trials.filter((item) => item.id !== trial.id), { ...trial }];
  }

  async clearTrials(): Promise<void> {
    this.trials = [];
  }
}
