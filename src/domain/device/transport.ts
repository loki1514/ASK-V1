import { AskPacket } from "@/domain/device/protocol";
import { SessionOutcome } from "@/domain/device/protocol";

// A session that completed ingestion and is ready for processing.
export type AskSession = {
  sessionId: string;
  deviceId: string;
  outcome: SessionOutcome;
  codec: string;
  audioBytesTotal: number;
  sequenceStart: number;
  sequenceEnd: number;
  errors: string[];
};

// Transport abstraction: the application firmware / gateway doesn't care how
// bytes travel (Wi-Fi WebSocket, HTTPS, BLE later). Matches the ESP32 layering:
// app stack > LwIP > Wi-Fi, so transport swaps without touching the protocol.
export type SessionListener = (session: AskSession) => void;

export interface DeviceTransport {
  readonly kind: "wifi_websocket" | "wifi_http" | "ble";
  connect(): Promise<void>;
  send(packet: AskPacket): Promise<void>;
  disconnect(): Promise<void>;
  onSession(listener: SessionListener): void;
}

export abstract class BaseDeviceTransport implements DeviceTransport {
  abstract readonly kind: DeviceTransport["kind"];
  private listener?: SessionListener;

  onSession(listener: SessionListener): void {
    this.listener = listener;
  }

  protected emit(session: AskSession): void {
    this.listener?.(session);
  }

  abstract connect(): Promise<void>;
  abstract send(packet: AskPacket): Promise<void>;
  abstract disconnect(): Promise<void>;
}
