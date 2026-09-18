/**
 * Voice Activity Detector (VAD)
 * Analyzes raw 16kHz 16-bit mono PCM audio frames for speech activity.
 */

export interface VadConfig {
  sampleRate: number;
  frameSizeMs: number;
  energyThreshold: number; // RMS threshold between 0.0 and 1.0
  silenceHangoverMs: number; // Duration of silence to wait before closing a speech turn
}

export interface VadFrameResult {
  isSpeech: boolean;
  rms: number;
  zeroCrossingRate: number;
}

export interface SpeechSegment {
  startMs: number;
  endMs: number;
  sampleCount: number;
}

export class VoiceActivityDetector {
  private config: VadConfig;
  private samplesPerFrame: number;
  private hangoverFrames: number;
  private silentFrameCount: number;
  private inSpeechTurn: boolean;
  private currentTurnStartMs: number;

  constructor(config?: Partial<VadConfig>) {
    this.config = {
      sampleRate: config?.sampleRate ?? 16000,
      frameSizeMs: config?.frameSizeMs ?? 30, // 30ms frames (480 samples at 16kHz)
      energyThreshold: config?.energyThreshold ?? 0.035,
      silenceHangoverMs: config?.silenceHangoverMs ?? 300,
    };
    this.samplesPerFrame = Math.floor((this.config.sampleRate * this.config.frameSizeMs) / 1000);
    this.hangoverFrames = Math.ceil(this.config.silenceHangoverMs / this.config.frameSizeMs);
    this.silentFrameCount = 0;
    this.inSpeechTurn = false;
    this.currentTurnStartMs = 0;
  }

  /**
   * Evaluates a single PCM audio frame.
   */
  public processFrame(samples: Int16Array | number[]): VadFrameResult {
    let sumSquares = 0;
    let zeroCrossings = 0;
    const len = samples.length;

    for (let i = 0; i < len; i++) {
      const normalized = samples[i] / 32768.0;
      sumSquares += normalized * normalized;
      if (i > 0 && ((samples[i] >= 0 && samples[i - 1] < 0) || (samples[i] < 0 && samples[i - 1] >= 0))) {
        zeroCrossings++;
      }
    }

    const rms = Math.sqrt(sumSquares / Math.max(1, len));
    const zcr = zeroCrossings / Math.max(1, len);
    const isSpeech = rms >= this.config.energyThreshold;

    return { isSpeech, rms, zeroCrossingRate: zcr };
  }

  /**
   * Segments continuous audio into distinct speech turns.
   */
  public segmentAudio(samples: Int16Array | number[]): SpeechSegment[] {
    const segments: SpeechSegment[] = [];
    const totalFrames = Math.floor(samples.length / this.samplesPerFrame);
    let speechStartMs = -1;
    let silenceCounter = 0;

    for (let i = 0; i < totalFrames; i++) {
      const startIdx = i * this.samplesPerFrame;
      const frame = samples.slice(startIdx, startIdx + this.samplesPerFrame);
      const { isSpeech } = this.processFrame(frame);
      const currentTimeMs = (startIdx / this.config.sampleRate) * 1000;

      if (isSpeech) {
        silenceCounter = 0;
        if (speechStartMs === -1) {
          speechStartMs = currentTimeMs;
        }
      } else {
        if (speechStartMs !== -1) {
          silenceCounter++;
          if (silenceCounter >= this.hangoverFrames) {
            const endMs = currentTimeMs;
            segments.push({
              startMs: Math.round(speechStartMs),
              endMs: Math.round(endMs),
              sampleCount: Math.round(((endMs - speechStartMs) * this.config.sampleRate) / 1000),
            });
            speechStartMs = -1;
            silenceCounter = 0;
          }
        }
      }
    }

    // Flush active speech at the end of stream
    if (speechStartMs !== -1) {
      const endMs = (samples.length / this.config.sampleRate) * 1000;
      segments.push({
        startMs: Math.round(speechStartMs),
        endMs: Math.round(endMs),
        sampleCount: Math.round(((endMs - speechStartMs) * this.config.sampleRate) / 1000),
      });
    }

    return segments;
  }
}
