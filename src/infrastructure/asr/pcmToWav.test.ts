import { describe, expect, it } from "vitest";
import { pcmToWav } from "./pcmToWav";
import { PcmAudioSample } from "@/domain/identity/model";

function makeSample(values: number[], sampleRate = 16000): PcmAudioSample {
  return {
    id: "test-sample",
    samples: new Float32Array(values),
    sampleRate,
    channels: 1,
    capturedAt: new Date().toISOString(),
  };
}

function readString(view: DataView, offset: number, length: number): string {
  let s = "";
  for (let i = 0; i < length; i += 1) {
    s += String.fromCharCode(view.getUint8(offset + i));
  }
  return s;
}

describe("pcmToWav", () => {
  it("produces a valid 16-bit mono WAV header", () => {
    const sample = makeSample([0, 0.5, -0.5, 1, -1]);
    const wav = pcmToWav(sample);
    const view = new DataView(wav.buffer, wav.byteOffset, wav.byteLength);

    expect(readString(view, 0, 4)).toBe("RIFF");
    expect(view.getUint32(4, true)).toBe(36 + sample.samples.length * 2);
    expect(readString(view, 8, 4)).toBe("WAVE");
    expect(readString(view, 12, 4)).toBe("fmt ");
    expect(view.getUint32(16, true)).toBe(16);
    expect(view.getUint16(20, true)).toBe(1); // PCM
    expect(view.getUint16(22, true)).toBe(1); // mono
    expect(view.getUint32(24, true)).toBe(sample.sampleRate);
    expect(view.getUint32(28, true)).toBe(sample.sampleRate * 2); // byte rate
    expect(view.getUint16(32, true)).toBe(2); // block align
    expect(view.getUint16(34, true)).toBe(16); // bits per sample
    expect(readString(view, 36, 4)).toBe("data");
    expect(view.getUint32(40, true)).toBe(sample.samples.length * 2);
  });

  it("clamps out-of-range samples to 16-bit bounds", () => {
    const sample = makeSample([2, -2, 1, -1, 0.5, -0.5]);
    const wav = pcmToWav(sample);
    const view = new DataView(wav.buffer, wav.byteOffset, wav.byteLength);
    expect(view.getInt16(44, true)).toBe(32767);
    expect(view.getInt16(46, true)).toBe(-32768);
    expect(view.getInt16(48, true)).toBe(32767);
    expect(view.getInt16(50, true)).toBe(-32768);
    expect(view.getInt16(52, true)).toBe(16383);
    expect(view.getInt16(54, true)).toBe(-16384);
  });

  it("respects the provided sample rate", () => {
    const sample = makeSample([0], 44100);
    const wav = pcmToWav(sample);
    const view = new DataView(wav.buffer, wav.byteOffset, wav.byteLength);
    expect(view.getUint32(24, true)).toBe(44100);
    expect(view.getUint32(28, true)).toBe(44100 * 2);
  });
});
