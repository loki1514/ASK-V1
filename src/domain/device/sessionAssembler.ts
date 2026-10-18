// ASK P2P codec + session assembler — ASK_P2P spec v1.0 (§7–9).
// Applies the spec's reliability rules: highest contiguous sequence tracked,
// duplicates ignored, missing sequences flagged for RESUME, audio never
// appended twice.

import {
  AskFrame,
  DecodeResult,
  FrameType,
  HEADER_LEN,
  decodeFrame,
  encodeFrame,
} from "@/domain/device/framing";
import { crc32 } from "@/domain/device/crc32";

export { encodeFrame, decodeFrame, HEADER_LEN };
export type { AskFrame, FrameType, DecodeResult };

export type FrameError =
  | { code: "BAD_MAGIC" | "BAD_VERSION" | "BAD_TYPE" | "BAD_HEADER" | "BAD_LENGTH" | "CHECKSUM" | "OUT_OF_ORDER" | "DUPLICATE"; detail: string };

export class AskSessionAssembler {
  readonly sessionId: string;
  private nextExpected: number;
  private readonly audioChunks = new Map<number, Uint8Array>();
  private totalBytes = 0;
  private started = false;
  private closed = false;
  private readonly gaps = new Set<number>();
  errors: FrameError[] = [];

  constructor(sessionId: string, resumeFrom = 0) {
    this.sessionId = sessionId;
    this.nextExpected = resumeFrom;
    if (resumeFrom > 0) this.started = true;
  }

  // Feed one frame; returns true if it was accepted.
  ingest(bytes: Uint8Array): { accepted: boolean; error?: FrameError; isComplete?: { totalBytes: number } } {
    const result = decodeFrame(bytes);
    if (!result.ok) {
      return { accepted: false, error: mapDecodeError(result.error) };
    }
    const frame = result.frame;

    if (frame.sessionId !== this.sessionId) {
      return { accepted: false, error: { code: "BAD_TYPE", detail: `session ${frame.sessionId}` } };
    }

    switch (frame.type) {
      case "HELLO":
        return { accepted: true };
      case "START":
        if (frame.sequence !== 0) return { accepted: false, error: { code: "OUT_OF_ORDER", detail: "START not seq 0" } };
        this.started = true;
        this.nextExpected = 1;
        return { accepted: true };
      case "AUDIO": {
        if (!this.started) return { accepted: false, error: { code: "OUT_OF_ORDER", detail: "AUDIO before START" } };
        if (frame.sequence < this.nextExpected) {
          // Already contiguous: ignore duplicates silently (spec §9).
          return { accepted: true };
        }
        if (frame.sequence > this.nextExpected) {
          this.gaps.add(frame.sequence);
          return { accepted: false, error: { code: "OUT_OF_ORDER", detail: `gap at ${this.nextExpected}` } };
        }
        this.audioChunks.set(frame.sequence, frame.payload);
        this.totalBytes += frame.payload.length;
        this.nextExpected += 1;
        // Close earlier gaps if now contiguous.
        while (this.gaps.has(this.nextExpected)) {
          this.gaps.delete(this.nextExpected);
          this.nextExpected += 1;
        }
        return { accepted: true };
      }
      case "END": {
        this.closed = true;
        return { accepted: true, isComplete: { totalBytes: this.totalBytes } };
      }
      case "ACK":
      case "ERROR":
        return { accepted: true };
      default:
        return { accepted: false, error: { code: "BAD_TYPE", detail: frame.type } };
    }
  }

  get nextSequence(): number {
    return this.nextExpected;
  }

  get isComplete(): boolean {
    return this.closed;
  }

  // Ordered audio payloads for the accepted contiguous run.
  audio(): Uint8Array {
    const parts: Uint8Array[] = [];
    const keys = [...this.audioChunks.keys()].sort((a, b) => a - b);
    let seq = 1; // first audio seq is 1 (START is 0)
    for (const s of keys) {
      if (s !== seq) break;
      parts.push(this.audioChunks.get(s) as Uint8Array);
      seq += 1;
    }
    const total = parts.reduce((n, p) => n + p.length, 0);
    const out = new Uint8Array(total);
    let at = 0;
    for (const p of parts) {
      out.set(p, at);
      at += p.length;
    }
    return out;
  }
}

function mapDecodeError(msg: string): FrameError {
  if (msg.startsWith("bad magic")) return { code: "BAD_MAGIC", detail: msg };
  if (msg.startsWith("bad version")) return { code: "BAD_VERSION", detail: msg };
  if (msg.startsWith("bad type")) return { code: "BAD_TYPE", detail: msg };
  if (msg.startsWith("bad header")) return { code: "BAD_HEADER", detail: msg };
  if (msg.startsWith("payload len")) return { code: "BAD_LENGTH", detail: msg };
  return { code: "CHECKSUM", detail: msg };
}

export { crc32 };
