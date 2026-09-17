import { crc32Hex } from "@/domain/device/crc32";
import {
  AskFrame,
  AskPacket,
  AskPacketType,
  AskProtocolError,
  MAX_PACKET_PAYLOAD_BYTES,
} from "@/domain/device/protocol";
import { ASK_PROTOCOL_VERSION } from "@/domain/device/protocol";

// --- Serialization: packet -> frame ---------------------------------------

const TYPE_TOKEN: Record<AskPacketType, string> = {
  SESSION_START: "SS",
  AUDIO_CHUNK: "AC",
  SESSION_END: "SE",
  DEVICE_STATUS: "DS",
  DEVICE_COMMAND_ACK: "CA",
};

const TYPE_FROM_TOKEN: Record<string, AskPacketType> = Object.fromEntries(
  Object.entries(TYPE_TOKEN).map(([type, token]) => [token, type as AskPacketType]),
);

// HEADER: ASK/<ver> <deviceId> <sessionId> <type> <seq> <tsMs> <codec> <payloadLen> <flags>\n
export function encodeFrame(packet: AskPacket): AskFrame {
  if (packet.payload.length > MAX_PACKET_PAYLOAD_BYTES) {
    throw new AskProtocolError(`payload ${packet.payload.length} exceeds max ${MAX_PACKET_PAYLOAD_BYTES}`, "PAYLOAD_TOO_LARGE");
  }
  const headerText = [
    `ASK/${packet.protocolVersion}`,
    packet.deviceId,
    packet.sessionId,
    TYPE_TOKEN[packet.packetType],
    String(packet.sequence),
    String(packet.timestampMs),
    packet.codec,
    String(packet.payload.length),
    String(packet.flags),
    "",
  ].join(" ");
  const headerBytes = new TextEncoder().encode(headerText);
  const body = new Uint8Array(headerBytes.length + packet.payload.length);
  body.set(headerBytes, 0);
  body.set(packet.payload, headerBytes.length);
  return { headerText, payload: packet.payload, checksumCrc32: crc32Hex(body) };
}

// --- Deserialization: frame -> packet -------------------------------------

export function decodeFrame(frame: AskFrame): AskPacket {
  const parts = frame.headerText.trim().split(" ");
  // ASK/1 deviceId sessionId type seq ts codec len flags (trailing space)
  if (parts.length < 9) {
    throw new AskProtocolError("header must have 9 fields", "MALFORMED_HEADER");
  }
  const [proto, deviceId, sessionId, typeToken, seqRaw, tsRaw, codec, lenRaw, flagsRaw] = parts;
  const version = Number(proto.split("/")[1]);
  if (version !== ASK_PROTOCOL_VERSION) {
    throw new AskProtocolError(`unsupported protocol version ${version}`, "BAD_PROTOCOL_VERSION");
  }
  const packetType = TYPE_FROM_TOKEN[typeToken];
  if (!packetType) {
    throw new AskProtocolError(`unknown packet type token ${typeToken}`, "MALFORMED_HEADER");
  }
  const sequence = Number(seqRaw);
  const timestampMs = Number(tsRaw);
  const declaredLen = Number(lenRaw);
  const flags = Number(flagsRaw);
  if (Number.isNaN(sequence) || Number.isNaN(timestampMs) || Number.isNaN(declaredLen) || Number.isNaN(flags)) {
    throw new AskProtocolError("non-numeric header field", "MALFORMED_HEADER");
  }
  if (declaredLen !== frame.payload.length) {
    throw new AskProtocolError(`header declares ${declaredLen} bytes, frame carries ${frame.payload.length}`, "PAYLOAD_TOO_LARGE");
  }
  return {
    protocolVersion: version,
    deviceId,
    sessionId,
    packetType,
    sequence,
    timestampMs,
    codec,
    payload: frame.payload,
    flags,
  };
}

// Verify a frame's checksum without trusting its header (guards header tamper).
export function verifyFrame(frame: AskFrame): boolean {
  const headerBytes = new TextEncoder().encode(frame.headerText);
  const body = new Uint8Array(headerBytes.length + frame.payload.length);
  body.set(headerBytes, 0);
  body.set(frame.payload, headerBytes.length);
  return crc32Hex(body) === frame.checksumCrc32;
}
