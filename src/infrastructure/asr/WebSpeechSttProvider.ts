import { PcmAudioSample } from "@/domain/identity/model";
import { SttProvider } from "./SttProvider";

type SpeechRecognitionEvent = {
  results: {
    [index: number]: {
      [index: number]: { transcript: string };
      isFinal?: boolean;
    };
  };
};

type SpeechRecognitionErrorEvent = {
  error: string;
};

type SpeechRecognitionLike = {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  continuous: boolean;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
};

type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  }
}

function friendlyWebSpeechError(error: string): string {
  switch (error) {
    case "not-allowed":
      return "Microphone permission denied. Please allow microphone access and try again.";
    case "no-speech":
      return "No speech was detected. Try speaking closer to the microphone.";
    case "audio-capture":
      return "No microphone found. Check that a microphone is connected and not in use by another app.";
    case "network":
      return "Network error while using speech recognition. Check your connection and try again.";
    case "aborted":
      return "Speech recognition was cancelled.";
    case "language-not-supported":
      return "The selected language is not supported by this browser.";
    case "service-not-allowed":
      return "Speech recognition service is not allowed in this context.";
    default:
      return `Web Speech error: ${error}`;
  }
}

export class WebSpeechSttProvider implements SttProvider {
  readonly name = "web-speech";
  private recognition?: SpeechRecognitionLike;
  private resultPromise?: Promise<string>;

  async transcribe(_sample: PcmAudioSample): Promise<string> {
    if (!this.resultPromise) {
      throw new Error("WebSpeechSttProvider was not started before transcribe was called");
    }
    return this.resultPromise;
  }

  async start(): Promise<void> {
    if (typeof window === "undefined") {
      throw new Error("Web Speech API is only available in browsers");
    }

    const Ctor = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    if (!Ctor) {
      throw new Error("Web Speech API is not supported in this browser");
    }

    this.recognition = new Ctor();
    this.recognition.lang = "en-US";
    this.recognition.interimResults = false;
    this.recognition.maxAlternatives = 1;
    this.recognition.continuous = false;

    this.resultPromise = new Promise<string>((resolve, reject) => {
      let settled = false;
      const recognition = this.recognition!;

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        if (settled) return;
        const transcript = event.results[0]?.[0]?.transcript;
        if (typeof transcript === "string" && transcript.trim()) {
          settled = true;
          resolve(transcript.trim());
        }
      };

      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        if (settled) return;
        settled = true;
        const message = friendlyWebSpeechError(event.error);
        reject(new Error(message));
      };

      recognition.onend = () => {
        if (settled) return;
        settled = true;
        reject(new Error("Web Speech ended without a result"));
      };

      recognition.start();
    });
  }

  async stop(): Promise<string> {
    try {
      this.recognition?.stop();
    } catch {
      // already stopped or never started
    }
    const transcript = await this.resultPromise!;
    this.resultPromise = undefined;
    this.recognition = undefined;
    return transcript;
  }
}
