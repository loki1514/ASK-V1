import { PcmAudioSample } from "@/domain/identity/model";
import { SttProvider } from "./SttProvider";
import { pcmToWavBlob } from "./pcmToWav";

export type OpenAiSttProviderOptions = {
  apiKey: string;
  model?: string;
  language?: string;
  baseUrl?: string;
};

export class OpenAiSttProvider implements SttProvider {
  readonly name = "openai-whisper";
  private readonly apiKey: string;
  private readonly model: string;
  private readonly language?: string;
  private readonly baseUrl: string;

  constructor(options: OpenAiSttProviderOptions) {
    this.apiKey = options.apiKey;
    this.model = options.model ?? "whisper-1";
    this.language = options.language;
    this.baseUrl = options.baseUrl ?? "https://api.openai.com/v1";
  }

  async transcribe(sample: PcmAudioSample): Promise<string> {
    const blob = pcmToWavBlob(sample);
    const formData = new FormData();
    formData.append("file", blob as unknown as Blob, "recording.wav");
    formData.append("model", this.model);
    if (this.language) formData.append("language", this.language);

    const response = await fetch(`${this.baseUrl}/audio/transcriptions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`OpenAI STT failed (${response.status}): ${body}`);
    }

    const json = (await response.json()) as { text?: string };
    if (typeof json.text !== "string") {
      throw new Error("OpenAI STT response did not contain a text field");
    }
    return json.text;
  }
}
