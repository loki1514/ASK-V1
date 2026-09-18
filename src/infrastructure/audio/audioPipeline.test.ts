import { describe, expect, it } from "vitest";
import { VoiceActivityDetector } from "@/domain/audio/vad";
import { BleAudioReceiver } from "./BleAudioReceiver";

describe("Audio Pipeline & Ingestion Subsystem (Phase 2)", () => {
  it("VAD detects speech frames vs silence", () => {
    const vad = new VoiceActivityDetector({ energyThreshold: 0.05 });

    // Silent frame (all zeros)
    const silentFrame = new Int16Array(480);
    const silentResult = vad.processFrame(silentFrame);
    expect(silentResult.isSpeech).toBe(false);
    expect(silentResult.rms).toBe(0);

    // Active speech frame (loud sine wave)
    const speechFrame = new Int16Array(480);
    for (let i = 0; i < 480; i++) {
      speechFrame[i] = Math.round(15000 * Math.sin((i * 2 * Math.PI) / 32));
    }
    const speechResult = vad.processFrame(speechFrame);
    expect(speechResult.isSpeech).toBe(true);
    expect(speechResult.rms).toBeGreaterThan(0.2);
  });

  it("VAD segments continuous audio stream into turns", () => {
    const vad = new VoiceActivityDetector({ energyThreshold: 0.05, silenceHangoverMs: 60 });
    const samples = new Int16Array(16000); // 1 second of audio

    // Inject speech turn between samples 1600 and 8000 (100ms to 500ms)
    for (let i = 1600; i < 8000; i++) {
      samples[i] = Math.round(12000 * Math.sin((i * 2 * Math.PI) / 20));
    }

    const segments = vad.segmentAudio(samples);
    expect(segments.length).toBeGreaterThan(0);
    expect(segments[0].startMs).toBeGreaterThanOrEqual(90);
    expect(segments[0].endMs).toBeLessThanOrEqual(600);
  });

  it("BleAudioReceiver reassembles packet sequence and tracks dropped packets", () => {
    let receivedBuffers = 0;
    const receiver = new BleAudioReceiver((buf) => {
      receivedBuffers++;
    });

    // Send packet with sequence 0
    const packet0 = new Uint8Array(24);
    packet0[3] = 0; // Sequence 0
    for (let i = 4; i < 24; i++) packet0[i] = 0x10;
    receiver.receivePacket(packet0);

    // Send packet with sequence 3 (packets 1 and 2 were dropped)
    const packet3 = new Uint8Array(24);
    packet3[3] = 3; // Sequence 3
    for (let i = 4; i < 24; i++) packet3[i] = 0x20;
    receiver.receivePacket(packet3);

    const stats = receiver.getStats();
    expect(stats.packetsReceived).toBe(2);
    expect(stats.packetsDropped).toBe(2); // Skipped 1 and 2
    expect(stats.lastSequenceNumber).toBe(3);

    // Flush remaining samples
    const flushed = receiver.flush();
    expect(flushed.length).toBe(20); // 10 samples per packet * 2 packets
  });
});
