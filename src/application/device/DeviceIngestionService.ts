import { AskFrame } from "@/domain/device/protocol";
import { AskSessionAssembler } from "@/domain/device/sessionAssembler";
import { SessionOutcome, SessionFrameError } from "@/domain/device/protocol";
import { AskSession } from "@/domain/device/transport";

// The gateway ingestion service: routes raw device frames to per-session
// assemblers and emits a ready-to-process AskSession on SESSION_END. Corrupt or
// out-of-order frames are rejected before any payload is passed downstream
// (the "missing/corrupt chunks detected before ASR" gate).
export type SessionConsumer = (session: AskSession) => void;

export class DeviceIngestionService {
  private readonly sessions = new Map<string, AskSessionAssembler>();
  private readonly consumer: SessionConsumer;

  constructor(consumer: SessionConsumer) {
    this.consumer = consumer;
  }

  ingestFrame(frame: AskFrame): SessionFrameError | undefined {
    // Extract the session id from the header without trusting payload.
    const sessionId = frame.headerText.trim().split(" ")[2];
    if (!sessionId) {
      return { code: "MALFORMED_HEADER", detail: "no session id in header" };
    }
    let assembler = this.sessions.get(sessionId);
    if (!assembler) {
      assembler = new AskSessionAssembler(sessionId);
      this.sessions.set(sessionId, assembler);
    }

    const result = assembler.ingest(frame);
    if (result && "code" in result) {
      return result as SessionFrameError;
    }
    if (result && result.outcome === SessionOutcome.Complete) {
      const chunks = result.chunks;
      const first = chunks[0];
      const last = chunks[chunks.length - 1];
      const session: AskSession = {
        sessionId,
        deviceId: first?.deviceId ?? "unknown",
        outcome: SessionOutcome.Complete,
        codec: first?.codec ?? "pcm_s16le_16khz_mono",
        audioBytesTotal: result.audioBytesTotal,
        sequenceStart: result.firstSequence,
        sequenceEnd: result.lastSequence,
        errors: result.errors.map((e) => `${e.code}: ${e.detail}`),
      };
      this.consumer(session);
      this.sessions.delete(sessionId);
    }
    return undefined;
  }
}
