// ASK Device Protocol — domain contracts.
//
// The device sends small sequential framed chunks (never one giant upload):
//   SESSION_START → AUDIO_CHUNK* → SESSION_END
// plus control/status packets. This module defines the frame layout, packet
// types, checksum, and sequence integrity rules. The "missing/corrupt chunks
// are detected before ASR" gate lives here (PRD §Phase 2).

export const ASK_PROTOCOL_VERSION = 1;

export const MAX_PACKET_PAYLOAD_BYTES = 16 * 1024;

export type AskPacketType =
  | "SESSION_START"
  | "AUDIO_CHUNK"
  | "SESSION_END"
  | "DEVICE_STATUS"
  | "DEVICE_COMMAND_ACK";

export type AskPacket = {
  protocolVersion: typeof ASK_PROTOCOL_VERSION;
  deviceId: string;
  sessionId: string;
  packetType: AskPacketType;
  sequence: number; // per-session, 0-based ordinal; must be gapless
  timestampMs: number; // device epoch ms
  payload: Uint8Array;
  codec: string; // "pcm_s16le_16khz_mono" | "opus"
  flags: number; // reserved, 0 for now
};

// The wire frame: header fields + payload + trailing checksum.
// Header is fixed-length ASCII to keep the ESP32 parser simple.
export type AskFrame = {
  headerText: string; // "ASK/1 <deviceId> <sessionId> <type> <seq> <ts> <codec> <len> <flags>\n"
  payload: Uint8Array;
  checksumCrc32: string; // 8 hex chars over headerText + payload
};

export type SessionFrameError =
  | { code: "BAD_PROTOCOL_VERSION"; detail: string }
  | { code: "MALFORMED_HEADER"; detail: string }
  | { code: "PAYLOAD_TOO_LARGE"; detail: string }
  | { code: "CHECKSUM_MISMATCH"; detail: string }
  | { code: "OUT_OF_ORDER"; detail: string }
  | { code: "DUPLICATE_SEQUENCE"; detail: string }
  | { code: "UNEXPECTED_PACKET_TYPE"; detail: string };

export type SessionState = "awaiting_start" | "streaming" | "closed";

export enum SessionOutcome {
  Complete = "complete",
  Incomplete = "incomplete",
  Corrupt = "corrupt",
}

export class AskProtocolError extends Error {
  constructor(
    message: string,
    readonly code: SessionFrameError["code"],
  ) {
    super(message);
    this.name = "AskProtocolError";
  }
}
