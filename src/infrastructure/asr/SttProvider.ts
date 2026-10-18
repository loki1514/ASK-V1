import { PcmAudioSample } from "@/domain/identity/model";

export interface SttProvider {
  readonly name: string;
  /**
   * Optional streaming hook. Called when the UI begins recording.
   * Providers that capture audio themselves (e.g. browser Web Speech) should
   * start listening here. File-based providers (Whisper, dev phrase) can skip it.
   */
  start?(): Promise<void>;
  /**
   * Optional streaming hook. Called when the UI stops recording.
   * Return the transcript if the provider already produced one during streaming.
   * If this is not implemented, the caller will pass the recorded sample to
   * `transcribe` instead.
   */
  stop?(): Promise<string>;
  /**
   * Transcribe a recorded PCM sample. Required for all providers; used as a
   * fallback when `stop` is not implemented.
   */
  transcribe(sample: PcmAudioSample): Promise<string>;
}
