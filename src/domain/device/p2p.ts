// P2P spec §8/§12: DeviceManager, TransferManager, AudioAssembler, SessionRepository.
// Platform-agnostic core (the BLE/Wi-Fi sockets are the thin platform layer).

import {
  ASK_PROTOCOL_VERSION,
  MAX_PACKET_PAYLOAD_BYTES,
} from "@/domain/device/protocol";

export type DeviceInfo = {
  deviceId: string;
  firmwareVersion: string;
  batteryPercent: number;
  capabilities: string[];
  rssi: number;
};

export type PairingResult = {
  ok: boolean;
  deviceId: string;
  error?: string;
};

export type SessionOptions = {
  sessionId: string;
  deviceId: string;
  codec: string;
  sampleRate: number;
  channels: number;
};

export type SessionInfo = {
  sessionId: string;
  deviceId: string;
  expectedChunks: number | undefined;
};

export type AudioFrame = {
  sessionId: string;
  sequence: number;
  timestampMs: number;
  payload: Uint8Array;
  crc32: number;
  isFinal: boolean;
};

export type SessionStatus =
  | "idle"
  | "discovering"
  | "pairing"
  | "connecting"
  | "streaming"
  | "verifying"
  | "committed"
  | "interrupted"
  | "error";

// ---- Session repository (spec §8) ----------------------------------------

export type TransferSessionRecord = {
  sessionId: string;
  deviceId: string;
  status: SessionStatus;
  nextExpectedSequence: number;
  highestContiguous: number;
  totalBytes: number;
  startedAt: string;
};

export class SessionRepository {
  private readonly sessions = new Map<string, TransferSessionRecord>();

  get(sessionId: string): TransferSessionRecord | undefined {
    return this.sessions.get(sessionId);
  }

  begin(session: SessionOptions): TransferSessionRecord {
    const record: TransferSessionRecord = {
      sessionId: session.sessionId,
      deviceId: session.deviceId,
      status: "streaming",
      nextExpectedSequence: 1, // 0 = START
      highestContiguous: 0,
      totalBytes: 0,
      startedAt: new Date().toISOString(),
    };
    this.sessions.set(session.sessionId, record);
    return record;
  }

  advance(sessionId: string, sequence: number, bytes: number): void {
    const record = this.sessions.get(sessionId);
    if (!record) return;
    record.nextExpectedSequence = sequence + 1;
    record.highestContiguous = sequence;
    record.totalBytes += bytes;
  }

  setStatus(sessionId: string, status: SessionStatus): void {
    const record = this.sessions.get(sessionId);
    if (record) record.status = status;
  }
}

// ---- TransferManager (spec §8/§9: ACK, retry, resume, completion) ---------

export type TransferEventListener = {
  onFrameAcked?: (sessionId: string, sequence: number) => void;
  onResumeRequested?: (sessionId: string, nextSequence: number) => void;
  onSessionComplete?: (sessionId: string, totalBytes: number) => void;
};

export class TransferManager {
  constructor(
    private readonly sessionRepo: SessionRepository,
    private readonly listener: TransferEventListener,
  ) {}

  // A frame arrived from the device. Returns true if it should be appended
  // (in-order, checksum-valid), false if duplicate/out-of-order/corrupt.
  acceptFrame(frame: AudioFrame): "append" | "duplicate" | "out_of_order" | "corrupt" | "unknown" {
    const record = this.sessionRepo.get(frame.sessionId);
    if (!record) return "unknown";

    if (frame.isFinal) {
      // END frame: device reports total; verify contiguous coverage later.
      this.sessionRepo.setStatus(frame.sessionId, "verifying");
      return "append";
    }

    if (frame.sequence < record.nextExpectedSequence) {
      return "duplicate";
    }
    if (frame.sequence > record.nextExpectedSequence) {
      // Gap: request resume from the next expected sequence.
      this.listener.onResumeRequested?.(frame.sessionId, record.nextExpectedSequence);
      return "out_of_order";
    }

    this.sessionRepo.advance(frame.sessionId, frame.sequence, frame.payload.length);
    this.listener.onFrameAcked?.(frame.sessionId, frame.sequence);
    return "append";
  }
}

// ---- AudioAssembler (spec §8) ---------------------------------------------

export class AudioAssembler {
  private readonly bySession = new Map<string, { frames: AudioFrame[]; bytes: number }>();

  append(frame: AudioFrame): void {
    const entry = this.bySession.get(frame.sessionId) ?? { frames: [], bytes: 0 };
    entry.frames.push(frame);
    entry.bytes += frame.payload.length;
    this.bySession.set(frame.sessionId, entry);
  }

  // Concatenated ordered PCM payloads for one session.
  assemble(sessionId: string): Uint8Array {
    const entry = this.bySession.get(sessionId);
    if (!entry) return new Uint8Array(0);
    const total = entry.bytes;
    const out = new Uint8Array(total);
    let offset = 0;
    for (const frame of entry.frames) {
      out.set(frame.payload, offset);
      offset += frame.payload.length;
    }
    return out;
  }

  frameCount(sessionId: string): number {
    return this.bySession.get(sessionId)?.frames.length ?? 0;
  }

  clear(sessionId: string): void {
    this.bySession.delete(sessionId);
  }
}

// ---- DeviceManager (spec §8/§12) ------------------------------------------

export abstract class BaseDeviceManager {
  abstract discover(): Promise<DeviceInfo[]>;
  abstract pair(deviceId: string): Promise<PairingResult>;
  abstract startSession(options: SessionOptions): Promise<SessionInfo>;
  abstract resume(sessionId: string, nextSequence: number): Promise<void>;
  abstract commit(sessionId: string, digest: string): Promise<void>;
  abstract disconnect(): Promise<void>;

  protected abstract receiveFrames(sessionId: string, onFrame: (frame: AudioFrame) => void): void;
}
