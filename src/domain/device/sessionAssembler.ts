import {
  AskPacket,
  SessionFrameError,
  SessionOutcome,
  SessionState,
} from "@/domain/device/protocol";
import { verifyFrame, decodeFrame, encodeFrame } from "@/domain/device/framing";
import { AskFrame } from "@/domain/device/protocol";

export type SessionResult = {
  outcome: SessionOutcome;
  sessionId: string;
  chunks: AskPacket[]; // AUDIO_CHUNK packets that passed integrity checks
  audioBytesTotal: number;
  firstSequence: number;
  lastSequence: number;
  errors: SessionFrameError[];
};

// Reassembles SESSION_START → AUDIO_CHUNK* → SESSION_END. Each frame is
// checksum-verified and sequenced before any payload is trusted, so missing or
// corrupted chunks are detected before ASR/processing (PRD §Phase 2 gate).
export class AskSessionAssembler {
  readonly sessionId: string;
  private state: SessionState = "awaiting_start";
  private chunks: AskPacket[] = [];
  private audioBytes = 0;
  private nextExpected = 0;
  private readonly errors: SessionFrameError[] = [];

  constructor(sessionId: string) {
    this.sessionId = sessionId;
  }

  getState(): SessionState {
    return this.state;
  }

  ingest(frame: AskFrame): SessionResult | SessionFrameError | undefined {
    if (this.state === "closed") {
      return err("UNEXPECTED_PACKET_TYPE", `session ${this.sessionId} already closed`);
    }

    if (!verifyFrame(frame)) {
      const error = err("CHECKSUM_MISMATCH", `frame ${summarize(frame)} failed checksum`);
      this.errors.push(error);
      return error;
    }

    let packet: AskPacket;
    try {
      packet = decodeFrame(frame);
    } catch (e) {
      const error = e as { code?: SessionFrameError["code"]; message?: string };
      this.errors.push({ code: error.code ?? "MALFORMED_HEADER", detail: error.message ?? "decode failed" });
      return { code: error.code ?? "MALFORMED_HEADER", detail: error.message ?? "decode failed" };
    }

    if (packet.sessionId !== this.sessionId) {
      const error = err("UNEXPECTED_PACKET_TYPE", `frame for session ${packet.sessionId}, expected ${this.sessionId}`);
      this.errors.push(error);
      return error;
    }

    if (packet.packetType === "SESSION_START") {
      if (this.state === "streaming") {
        const error = err("UNEXPECTED_PACKET_TYPE", "SESSION_START while already streaming");
        this.errors.push(error);
        return error;
      }
      if (packet.sequence !== 0) {
        const error = err("OUT_OF_ORDER", `SESSION_START must be sequence 0, got ${packet.sequence}`);
        this.errors.push(error);
        return error;
      }
      this.state = "streaming";
      this.nextExpected = 1;
      return undefined;
    }

    if (this.state !== "streaming") {
      const error = err("UNEXPECTED_PACKET_TYPE", `${packet.packetType} before SESSION_START`);
      this.errors.push(error);
      return error;
    }

    if (packet.packetType === "AUDIO_CHUNK") {
      if (packet.sequence !== this.nextExpected) {
        const error = err(
          packet.sequence < this.nextExpected ? "DUPLICATE_SEQUENCE" : "OUT_OF_ORDER",
          `expected sequence ${this.nextExpected}, got ${packet.sequence}`,
        );
        this.errors.push(error);
        return error;
      }
      this.chunks.push(packet);
      this.audioBytes += packet.payload.length;
      this.nextExpected += 1;
      return undefined;
    }

    if (packet.packetType === "SESSION_END") {
      if (packet.sequence !== this.nextExpected) {
        const error = err(
          packet.sequence < this.nextExpected ? "DUPLICATE_SEQUENCE" : "OUT_OF_ORDER",
          `SESSION_END expected sequence ${this.nextExpected}, got ${packet.sequence}`,
        );
        this.errors.push(error);
        return error;
      }
      this.state = "closed";
      return this.result(SessionOutcome.Complete);
    }

    // DEVICE_STATUS / DEVICE_COMMAND_ACK don't affect the audio stream.
    return undefined;
  }

  abort(): SessionResult {
    this.state = "closed";
    return this.result(this.chunks.length ? SessionOutcome.Incomplete : SessionOutcome.Corrupt);
  }

  private result(outcome: SessionOutcome): SessionResult {
    return {
      outcome,
      sessionId: this.sessionId,
      chunks: this.chunks,
      audioBytesTotal: this.audioBytes,
      firstSequence: this.chunks.length ? this.chunks[0].sequence : -1,
      lastSequence: this.chunks.length ? this.chunks[this.chunks.length - 1].sequence : -1,
      errors: [...this.errors],
    };
  }
}

function err(code: SessionFrameError["code"], detail: string): SessionFrameError {
  return { code, detail };
}

function summarize(frame: AskFrame): string {
  return frame.headerText.trim().split(" ").slice(0, 4).join(" ");
}
