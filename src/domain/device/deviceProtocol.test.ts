import { describe, expect, it } from "vitest";
import { crc32 } from "@/domain/device/crc32";
import { AskSessionAssembler } from "@/domain/device/sessionAssembler";
import { encodeFrame, decodeFrame, HEADER_LEN, AskFrame, FrameType } from "@/domain/device/framing";
import { InMemoryDeviceTransport } from "@/domain/device/transport";

function frame(over: Partial<AskFrame> = {}): Uint8Array {
  const base: AskFrame = {
    type: "AUDIO",
    flags: 0,
    sessionId: "C-92831",
    sequence: 1,
    timestampMs: 1_726_578_123_000,
    payload: new Uint8Array([1, 2, 3, 4]),
    crc32: 0,
  };
  return encodeFrame({ ...base, ...over });
}

describe("ASK P2P binary framing (spec §7)", () => {
  it("round-trips a frame through encode/decode", () => {
    const bytes = frame({ type: "AUDIO", payload: new Uint8Array([9, 8, 7]) });
    expect(bytes.length).toBe(HEADER_LEN + 3);
    const result = decodeFrame(bytes);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.frame.sessionId).toBe("C-92831");
    expect(result.frame.sequence).toBe(1);
    expect(result.frame.type).toBe("AUDIO");
    expect([...result.frame.payload]).toEqual([9, 8, 7]);
  });

  it("rejects a corrupted payload via crc", () => {
    const bytes = frame();
    bytes[bytes.length - 1] ^= 0xff; // flip a payload byte
    const result = decodeFrame(bytes);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toContain("crc");
  });

  it("rejects truncated and bad-magic frames", () => {
    expect(decodeFrame(new Uint8Array(10)).ok).toBe(false);
    const bad = frame();
    bad[0] = 0x99;
    expect(decodeFrame(bad).ok).toBe(false);
  });

  it("validates header length field", () => {
    const bytes = frame();
    bytes[5] = 99;
    expect(decodeFrame(bytes).ok).toBe(false);
  });
});

describe("session assembler reliability (spec §9)", () => {
  it("assembles a START -> AUDIO* -> END session", () => {
    const a = new AskSessionAssembler("C-92831");
    expect(a.ingest(frame({ type: "START", sequence: 0, payload: new Uint8Array(0) })).accepted).toBe(true);
    expect(a.ingest(frame({ type: "AUDIO", sequence: 1, payload: new Uint8Array([1, 2]) })).accepted).toBe(true);
    expect(a.ingest(frame({ type: "AUDIO", sequence: 2, payload: new Uint8Array([3]) })).accepted).toBe(true);
    const end = a.ingest(frame({ type: "END", sequence: 3, payload: new Uint8Array(0) }));
    expect(end.accepted).toBe(true);
    expect(a.isComplete).toBe(true);
    expect([...a.audio()]).toEqual([1, 2, 3]);
  });

  it("ignores duplicates and flags gaps", () => {
    const a = new AskSessionAssembler("C-92831");
    a.ingest(frame({ type: "START", sequence: 0, payload: new Uint8Array(0) }));
    a.ingest(frame({ type: "AUDIO", sequence: 1 }));
    // Duplicate of seq 1: ignored silently (accepted, no error).
    const dup = a.ingest(frame({ type: "AUDIO", sequence: 1 }));
    expect(dup.accepted).toBe(true);
    expect(dup.error).toBeUndefined();
    // Gap: seq 3 with 2 missing.
    const gap = a.ingest(frame({ type: "AUDIO", sequence: 3 }));
    expect(gap.accepted).toBe(false);
    if (!gap.accepted && gap.error) expect(gap.error.code).toBe("OUT_OF_ORDER");
    // Fill 2, then 3 becomes contiguous.
    a.ingest(frame({ type: "AUDIO", sequence: 2 }));
    expect(a.ingest(frame({ type: "AUDIO", sequence: 3 })).accepted).toBe(true);
    expect(a.nextSequence).toBe(4);
  });

  it("never doubles audio bytes on resume", () => {
    const a = new AskSessionAssembler("C-92831");
    a.ingest(frame({ type: "START", sequence: 0, payload: new Uint8Array(0) }));
    a.ingest(frame({ type: "AUDIO", sequence: 1, payload: new Uint8Array([1, 1]) }));
    // Resume: new assembler resumes from nextSequence=2 (seq 1 already held).
    const r = new AskSessionAssembler("C-92831", 2);
    r.ingest(frame({ type: "AUDIO", sequence: 2, payload: new Uint8Array([2, 2]) }));
    expect([...r.audio()]).toEqual([2, 2]);
  });

  it("matches the transport contract (spec §12)", async () => {
    const t = new InMemoryDeviceTransport();
    const devices = await t.discover();
    expect(devices.length).toBeGreaterThan(0);
    const pair = await t.pair(devices[0].deviceId);
    expect(pair.paired).toBe(true);
    const session = await t.startSession();
    expect(session.sessionId).toBeTruthy();
    const frames: AudioFrame[] = [];
    await t.receiveFrames(session.sessionId, async (f) => { frames.push(f); });
    await t.injectFrame({ sessionId: session.sessionId, sequence: 1, timestampMs: Date.now(), payload: new Uint8Array([5]), crc32: crc32(new Uint8Array([5])), isFinal: false });
    expect(frames).toHaveLength(1);
    await t.commit(session.sessionId, "digest");
  });
});

import { AudioFrame } from "@/domain/device/transport";
