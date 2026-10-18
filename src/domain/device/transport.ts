// ASK P2P transport contract — ASK_P2P spec v1.0 (§12).
// The app-side abstraction over BLE control + local Wi-Fi bulk data. The
// firmware implements the same contract on its side.

export type DeviceInfo = {
  deviceId: string;
  name: string;
  firmwareVersion: string;
  transport: "ble" | "wifi";
};

export type PairingResult = {
  paired: boolean;
  deviceId: string;
};

export type SessionOptions = {
  sessionId?: string;
  sampleRate?: number;
  channels?: number;
  codec?: string;
};

export type SessionInfo = {
  sessionId: string;
  startedAt: number;
};

export type AudioFrame = {
  sessionId: string;
  sequence: number;
  timestampMs: number;
  payload: Uint8Array;
  crc32: number;
  isFinal: boolean;
};

export interface DeviceTransport {
  discover(): Promise<DeviceInfo[]>;
  pair(deviceId: string): Promise<PairingResult>;
  connect(deviceId: string): Promise<void>;
  startSession(options?: SessionOptions): Promise<SessionInfo>;
  receiveFrames(sessionId: string, onFrame: (frame: AudioFrame) => Promise<void>): Promise<void>;
  resume(sessionId: string, nextSequence: number): Promise<void>;
  commit(sessionId: string, digest: string): Promise<void>;
  disconnect(): Promise<void>;
}

export class InMemoryDeviceTransport implements DeviceTransport {
  private pairedDevices = new Map<string, DeviceInfo>();
  private onFrameHandler?: (frame: AudioFrame) => Promise<void>;

  async discover(): Promise<DeviceInfo[]> {
    // Prototype: the seeded demo device.
    return [
      { deviceId: "ASK-000123", name: "A7F2", firmwareVersion: "0.9", transport: "wifi" },
    ];
  }

  async pair(deviceId: string): Promise<PairingResult> {
    this.pairedDevices.set(deviceId, { deviceId, name: "A7F2", firmwareVersion: "0.9", transport: "wifi" });
    return { paired: true, deviceId };
  }

  async connect(_deviceId: string): Promise<void> {}

  async startSession(options?: SessionOptions): Promise<SessionInfo> {
    const sessionId = options?.sessionId ?? `C-${Math.random().toString(36).slice(2, 10).toUpperCase()}`;
    return { sessionId, startedAt: Date.now() };
  }

  async receiveFrames(sessionId: string, onFrame: (frame: AudioFrame) => Promise<void>): Promise<void> {
    this.onFrameHandler = (frame) => onFrame({ ...frame, sessionId });
    // Test hook: frames injected via injectFrame().
  }

  async resume(_sessionId: string, _nextSequence: number): Promise<void> {}

  async commit(_sessionId: string, _digest: string): Promise<void> {}

  async disconnect(): Promise<void> {}

  async injectFrame(frame: AudioFrame): Promise<void> {
    if (this.onFrameHandler) await this.onFrameHandler(frame);
  }
}
