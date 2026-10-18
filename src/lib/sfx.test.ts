import { describe, expect, it, vi } from "vitest";
import { __testGetSoundUri } from "./sfx";

vi.mock("expo-audio", () => ({
  createAudioPlayer: vi.fn(() => ({
    play: vi.fn(),
    pause: vi.fn(),
    release: vi.fn(),
  })),
}));

describe("sfx tone generator", () => {
  it("generates a valid base64 WAV data URI", () => {
    const uri = __testGetSoundUri("record_start");
    expect(uri.startsWith("data:audio/wav;base64,")).toBe(true);
    const base64 = uri.split(",")[1];
    const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
    const view = new DataView(bytes.buffer);

    expect(String.fromCharCode(bytes[0], bytes[1], bytes[2], bytes[3])).toBe("RIFF");
    expect(String.fromCharCode(bytes[8], bytes[9], bytes[10], bytes[11])).toBe("WAVE");
    expect(String.fromCharCode(bytes[12], bytes[13], bytes[14], bytes[15])).toBe("fmt ");
    expect(view.getUint16(20, true)).toBe(1); // PCM
    expect(view.getUint16(22, true)).toBe(1); // mono
  });

  it("produces distinct URIs for different sounds", () => {
    const start = __testGetSoundUri("record_start");
    const stop = __testGetSoundUri("record_stop");
    expect(start).not.toBe(stop);
  });
});
