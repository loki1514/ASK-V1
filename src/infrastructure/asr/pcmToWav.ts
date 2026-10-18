import { PcmAudioSample } from "@/domain/identity/model";

function writeString(view: DataView, offset: number, value: string): void {
  for (let i = 0; i < value.length; i += 1) {
    view.setUint8(offset + i, value.charCodeAt(i));
  }
}

function clamp16(value: number): number {
  const scaled = value < 0 ? value * 0x8000 : value * 0x7fff;
  return Math.max(-0x8000, Math.min(0x7fff, scaled));
}

export function pcmToWav(sample: PcmAudioSample): Uint8Array {
  const bytesPerSample = 2;
  const blockAlign = sample.channels * bytesPerSample;
  const dataSize = sample.samples.length * bytesPerSample;
  const headerSize = 44;
  const buffer = new ArrayBuffer(headerSize + dataSize);
  const view = new DataView(buffer);
  const byteRate = sample.sampleRate * blockAlign;

  writeString(view, 0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeString(view, 8, "WAVE");
  writeString(view, 12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, sample.channels, true);
  view.setUint32(24, sample.sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 16, true); // bits per sample
  writeString(view, 36, "data");
  view.setUint32(40, dataSize, true);

  let offset = headerSize;
  for (const value of sample.samples) {
    view.setInt16(offset, clamp16(value), true);
    offset += bytesPerSample;
  }

  return new Uint8Array(buffer);
}

export function pcmToWavBlob(sample: PcmAudioSample): Blob {
  return new Blob([pcmToWav(sample) as unknown as ArrayBuffer], { type: "audio/wav" });
}
