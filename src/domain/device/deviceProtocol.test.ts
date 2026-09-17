import { describe, expect, it } from "vitest";
import { crc32Hex } from "@/domain/device/crc32";
import { AskSessionAssembler } from "@/domain/device/sessionAssembler";
import { encodeFrame, decodeFrame, verifyFrame } from "@/domain/device/framing";
import { AskPacket, SessionOutcome, ASK_PROTOCOL_VERSION } from "@/domain/device/protocol";
import { DeviceIngestionService } from "@/application/device/DeviceIngestionService";

function packet(over: Partial<AskPacket> = {}): AskPacket {
  return {
    protocolVersion: ASK_PROTOCOL_VERSION,
    deviceId: "ASK-000123",
    sessionId: "C-92831",
    packetType: "AUDIO_CHUNK",
    sequence: 0,
    timestampMs: 1_726_578_123_000,
    payload: new Uint8Array([1, 2, 3, 4]),
    codec: "pcm_s16le_16khz_mono",
    flags: 0,
    ...over,
  };
}

describe("device protocol framing + integrity", () => {
  it("round-trips a packet through encode/decode", () => {
    const frame = encodeFrame(packet());
    expect(verifyFrame(frame)).toBe(true);
    const decoded = decodeFrame(frame);
    expect(decoded.deviceId).toBe("ASK-000123");
    expect(decoded.sessionId).toBe("C-92831");
    expect(decoded.sequence).toBe(0);
    expect([...decoded.payload]).toEqual([1, 2, 3, 4]);
  });

  it("detects a corrupted payload via checksum", () => {
    const frame = encodeFrame(packet());
    frame.payload = new Uint8Array([9, 9, 9, 9]); // tampered
    expect(verifyFrame(frame)).toBe(false);
    const assembler = new AskSessionAssembler("C-92831");
    const result = assembler.ingest(encodeFrame(packet({ packetType: "SESSION_START" })));
    expect(result).toBeUndefined();
    const bad = assembler.ingest(frame);
    expect(bad && "code" in bad ? (bad as { code: string }).code : "").toBe("CHECKSUM_MISMATCH");
  });

  it("rejects out-of-order and duplicate sequences", () => {
    const assembler = new AskSessionAssembler("C-92831");
    assembler.ingest(encodeFrame(packet({ packetType: "SESSION_START", sequence: 0 })));
    const chunk4 = assembler.ingest(encodeFrame(packet({ sequence: 4 })));
    expect(chunk4 && "code" in chunk4 ? (chunk4 as { code: string }).code : "").toBe("OUT_OF_ORDER");
    assembler.ingest(encodeFrame(packet({ sequence: 1 })));
    const dup = assembler.ingest(encodeFrame(packet({ sequence: 1 })));
    expect(dup && "code" in dup ? (dup as { code: string }).code : "").toBe("DUPLICATE_SEQUENCE");
  });
});

describe("gateway ingestion (device → session)", () => {
  it("emits a complete session only after SESSION_START + chunks + SESSION_END", () => {
    const received: string[] = [];
    const service = new DeviceIngestionService((session) => received.push(`${session.sessionId}:${session.outcome}:${session.audioBytesTotal}`));

    service.ingestFrame(encodeFrame(packet({ packetType: "SESSION_START", sequence: 0, payload: new Uint8Array(0) })));
    service.ingestFrame(encodeFrame(packet({ sequence: 1, payload: new Uint8Array([1, 2, 3]) })));
    service.ingestFrame(encodeFrame(packet({ sequence: 2, payload: new Uint8Array([4, 5]) })));
    expect(received).toHaveLength(0); // no SESSION_END yet

    service.ingestFrame(encodeFrame(packet({ packetType: "SESSION_END", sequence: 3, payload: new Uint8Array(0) })));
    expect(received).toHaveLength(1);
    expect(received[0]).toBe("C-92831:complete:5");
  });

  it("never forwards a corrupt chunk to processing", () => {
    const received: string[] = [];
    const service = new DeviceIngestionService((s) => received.push(`${s.outcome}:${s.audioBytesTotal}`));

    service.ingestFrame(encodeFrame(packet({ packetType: "SESSION_START", sequence: 0, payload: new Uint8Array(0) })));
    const good = encodeFrame(packet({ sequence: 1, payload: new Uint8Array([7, 7, 7]) }));
    const corrupted = encodeFrame(packet({ sequence: 2, payload: new Uint8Array([8, 8]) }));
    corrupted.payload = new Uint8Array([255, 255]); // corrupt: fails checksum, dropped
    service.ingestFrame(good);
    service.ingestFrame(corrupted); // rejected by checksum
    service.ingestFrame(encodeFrame(packet({ packetType: "SESSION_END", sequence: 2, payload: new Uint8Array(0) })));
    // Corrupt chunk never became a session chunk; only the good chunk (3 bytes) was processed.
    expect(received).toHaveLength(1);
    expect(received[0]).toBe("complete:3");
  });
});

describe("crc32 reference", () => {
  it("matches the well-known CRC32 of '123456789'", () => {
    expect(crc32Hex(new TextEncoder().encode("123456789"))).toBe("cbf43926");
  });
});
