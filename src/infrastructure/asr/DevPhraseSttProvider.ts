import { PcmAudioSample } from "@/domain/identity/model";
import { SttProvider } from "./SttProvider";
import { loadDevSettings } from "@/infrastructure/dev/devSettingsStore";

export class DevPhraseSttProvider implements SttProvider {
  readonly name = "dev-phrase";

  async transcribe(_sample: PcmAudioSample): Promise<string> {
    const settings = await loadDevSettings();
    const phrase = settings.mockSttPhrase.trim();
    if (!phrase) {
      throw new Error(
        "Dev phrase STT is active but no mock phrase is set. Go to the record screen and enter the sentence you plan to say, or switch to a real STT provider.",
      );
    }
    return phrase;
  }
}
