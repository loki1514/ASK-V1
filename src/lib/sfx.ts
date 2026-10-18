import { createAudioPlayer } from "expo-audio";

export type SfxName = "record_start" | "record_stop" | "success" | "error";

type ToneConfig = {
  frequency: number;
  durationMs: number;
  volume?: number;
  sampleRate?: number;
};

function clamp16(value: number): number {
  const scaled = value < 0 ? value * 0x8000 : value * 0x7fff;
  return Math.max(-0x8000, Math.min(0x7fff, scaled));
}

function writeString(view: DataView, offset: number, value: string): void {
  for (let i = 0; i < value.length; i += 1) {
    view.setUint8(offset + i, value.charCodeAt(i));
  }
}

function pcmToWav(samples: Float32Array, sampleRate: number): Uint8Array {
  const bytesPerSample = 2;
  const blockAlign = 1 * bytesPerSample;
  const dataSize = samples.length * bytesPerSample;
  const headerSize = 44;
  const buffer = new ArrayBuffer(headerSize + dataSize);
  const view = new DataView(buffer);
  const byteRate = sampleRate * blockAlign;

  writeString(view, 0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeString(view, 8, "WAVE");
  writeString(view, 12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 16, true);
  writeString(view, 36, "data");
  view.setUint32(40, dataSize, true);

  let offset = headerSize;
  for (const value of samples) {
    view.setInt16(offset, clamp16(value), true);
    offset += bytesPerSample;
  }

  return new Uint8Array(buffer);
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  const len = bytes.byteLength;
  for (let i = 0; i < len; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function generateToneWav(config: ToneConfig): string {
  const sampleRate = config.sampleRate ?? 22050;
  const durationMs = config.durationMs;
  const frequency = config.frequency;
  const volume = Math.max(0, Math.min(1, config.volume ?? 0.6));
  const totalSamples = Math.floor((durationMs / 1000) * sampleRate);
  const samples = new Float32Array(totalSamples);

  for (let i = 0; i < totalSamples; i += 1) {
    const t = i / sampleRate;
    // Add a tiny attack/decay envelope to avoid clicking.
    const envelope = Math.min(1, i / 80) * Math.min(1, (totalSamples - i) / 80);
    samples[i] = Math.sin(2 * Math.PI * frequency * t) * volume * envelope;
  }

  const wav = pcmToWav(samples, sampleRate);
  return `data:audio/wav;base64,${bytesToBase64(wav)}`;
}

const SOUND_URIS: Record<SfxName, string> = {
  record_start: generateToneWav({ frequency: 880, durationMs: 120, volume: 0.5 }),
  record_stop: generateToneWav({ frequency: 440, durationMs: 120, volume: 0.5 }),
  success: generateToneWav({ frequency: 660, durationMs: 180, volume: 0.4 }),
  error: generateToneWav({ frequency: 150, durationMs: 250, volume: 0.5 }),
};

let audioEnabled = true;

export function setSfxEnabled(enabled: boolean): void {
  audioEnabled = enabled;
}

export function playSfx(name: SfxName): void {
  if (!audioEnabled) return;
  try {
    const player = createAudioPlayer(SOUND_URIS[name], { keepAudioSessionActive: true });
    player.play();
    // Release after playback. The player doesn't expose an on-ended callback in
    // all versions, so we use a conservative timeout based on the sound duration.
    setTimeout(() => {
      try {
        player.pause();
        player.release?.();
      } catch {
        // ignore
      }
    }, 400);
  } catch {
    // SFX is optional; fail silently in restricted environments.
  }
}

// Exposed for tests.
export function __testGetSoundUri(name: SfxName): string {
  return SOUND_URIS[name];
}
