// ASK Device ↔ App binary frame format — ASK_P2P spec v1.0 (§7).
// Fixed-size binary header; never a raw byte stream.

import { crc32 } from "@/domain/device/crc32";

export const MAGIC = [0x41, 0x53]; // "AS"
export const PROTOCOL_VERSION = 1;

export type FrameType = "HELLO" | "START" | "AUDIO" | "END" | "ACK" | "ERROR";

export const FRAME_TYPE_BYTE: Record<FrameType, number> = {
  HELLO: 0x01,
  START: 0x02,
  AUDIO: 0x03,
  END: 0x04,
  ACK: 0x05,
  ERROR: 0x06,
};

export const FRAME_TYPE_FROM_BYTE: Record<number, FrameType> = {
  0x01: "HELLO",
  0x02: "START",
  0x03: "AUDIO",
  0x04: "END",
  0x05: "ACK",
  0x06: "ERROR",
};

// Binary header layout (42 bytes fixed):
//   MAGIC(2) VERSION(1) TYPE(1) FLAGS(1) HEADER_LEN(1) SESSION_ID(16) SEQ(4) TS(8) PAYLOAD_LEN(4) CRC32(4)
export const HEADER_LEN = 42;

export type AskFrame = {
  type: FrameType;
  flags: number;
  sessionId: string; // 16 bytes ASCII
  sequence: number;
  timestampMs: number;
  payload: Uint8Array;
  crc32: number;
};

export function encodeFrame(frame: AskFrame): Uint8Array {
  const header = new Uint8Array(HEADER_LEN);
  header[0] = MAGIC[0];
  header[1] = MAGIC[1];
  header[2] = PROTOCOL_VERSION;
  header[3] = FRAME_TYPE_BYTE[frame.type];
  header[4] = frame.flags & 0xff;
  header[5] = HEADER_LEN;
  const sid = new TextEncoder().encode(frame.sessionId.padEnd(16, " ").slice(0, 16));
  header.set(sid, 6);
  header.set(uint32(frame.sequence), 22);
  header.set(uint64(frame.timestampMs), 26);
  header.set(uint32(frame.payload.length), 34);

  // CRC32 covers header bytes 0..37 (through payload_len) + payload.
  const body = new Uint8Array(HEADER_LEN - 4 + frame.payload.length);
  body.set(header.subarray(0, HEADER_LEN - 4), 0);
  body.set(frame.payload, HEADER_LEN - 4);
  const crc = crc32(body);
  header.set(uint32(crc), 38);

  const out = new Uint8Array(HEADER_LEN + frame.payload.length);
  out.set(header, 0);
  out.set(frame.payload, HEADER_LEN);
  return out;
}

export type DecodeResult =
  | { ok: true; frame: AskFrame }
  | { ok: false; error: string };

export function decodeFrame(bytes: Uint8Array): DecodeResult {
  if (bytes.length < HEADER_LEN) return { ok: false, error: `short frame ${bytes.length}` };
  if (bytes[0] !== MAGIC[0] || bytes[1] !== MAGIC[1]) return { ok: false, error: "bad magic" };
  if (bytes[2] !== PROTOCOL_VERSION) return { ok: false, error: `bad version ${bytes[2]}` };

  const type = FRAME_TYPE_FROM_BYTE[bytes[3]];
  if (!type) return { ok: false, error: `bad type ${bytes[3]}` };
  const headerLen = bytes[5];
  if (headerLen !== HEADER_LEN) return { ok: false, error: `bad header len ${headerLen}` };

  const sessionId = new TextDecoder().decode(bytes.subarray(6, 22)).replace(/[^\x20-\x7e]/g, "").trim();
  const sequence = bytesToUint32(bytes, 22);
  const timestampMs = bytesToUint64(bytes, 26);
  const payloadLen = bytesToUint32(bytes, 34);
  const expectedCrc = bytesToUint32(bytes, 38);

  if (payloadLen !== bytes.length - HEADER_LEN) return { ok: false, error: `payload len ${payloadLen} vs ${bytes.length - HEADER_LEN}` };

  const body = new Uint8Array(HEADER_LEN - 4 + payloadLen);
  body.set(bytes.subarray(0, HEADER_LEN - 4), 0);
  body.set(bytes.subarray(HEADER_LEN), HEADER_LEN - 4);
  const actualCrc = crc32(body);
  if (actualCrc !== expectedCrc) return { ok: false, error: "crc mismatch" };

  return {
    ok: true,
    frame: {
      type,
      flags: bytes[4],
      sessionId,
      sequence,
      timestampMs,
      payload: bytes.subarray(HEADER_LEN),
      crc32: expectedCrc,
    },
  };
}

// --- byte helpers ----------------------------------------------------------

function uint32(n: number): Uint8Array {
  const out = new Uint8Array(4);
  new DataView(out.buffer).setUint32(0, n >>> 0);
  return out;
}

function uint64(n: number): Uint8Array {
  const out = new Uint8Array(8);
  const dv = new DataView(out.buffer);
  const hi = Math.floor(n / 0x100000000);
  dv.setUint32(0, hi >>> 0);
  dv.setUint32(4, n >>> 0);
  return out;
}

function bytesToUint32(bytes: Uint8Array, at: number): number {
  return new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint32(at);
}

function bytesToUint64(bytes: Uint8Array, at: number): number {
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  return dv.getUint32(at) * 0x100000000 + dv.getUint32(at + 4);
}
