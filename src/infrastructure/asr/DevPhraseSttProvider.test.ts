import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { DevPhraseSttProvider } from "./DevPhraseSttProvider";
import { PcmAudioSample } from "@/domain/identity/model";
import { clearDevSettingsCache } from "@/infrastructure/dev/devSettingsStore";

const mockGetItem = vi.fn();
const mockSetItem = vi.fn();

vi.mock("@react-native-async-storage/async-storage", () => ({
  default: {
    getItem: (...args: unknown[]) => mockGetItem(...args),
    setItem: (...args: unknown[]) => mockSetItem(...args),
  },
}));

function makeSample(): PcmAudioSample {
  return {
    id: "test-sample",
    samples: new Float32Array([0, 0.5, -0.5]),
    sampleRate: 16000,
    channels: 1,
    capturedAt: new Date().toISOString(),
  };
}

describe("DevPhraseSttProvider", () => {
  beforeEach(() => {
    clearDevSettingsCache();
    mockGetItem.mockReset();
    mockSetItem.mockReset();
  });

  afterEach(() => {
    clearDevSettingsCache();
  });

  it("returns the configured mock phrase", async () => {
    mockGetItem.mockResolvedValue(JSON.stringify({ mockSttPhrase: "Send the revised drawing by Wednesday." }));
    const provider = new DevPhraseSttProvider();
    const text = await provider.transcribe(makeSample());
    expect(text).toBe("Send the revised drawing by Wednesday.");
  });

  it("trims whitespace from the phrase", async () => {
    mockGetItem.mockResolvedValue(JSON.stringify({ mockSttPhrase: "  hello world  " }));
    const provider = new DevPhraseSttProvider();
    const text = await provider.transcribe(makeSample());
    expect(text).toBe("hello world");
  });

  it("throws when no mock phrase is configured", async () => {
    mockGetItem.mockResolvedValue(JSON.stringify({ mockSttPhrase: "" }));
    const provider = new DevPhraseSttProvider();
    await expect(provider.transcribe(makeSample())).rejects.toThrow("no mock phrase is set");
  });
});
