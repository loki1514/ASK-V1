import { AskFrame } from "@/domain/device/protocol";
import { encodeFrame } from "@/domain/device/framing";
import { AskPacket } from "@/domain/device/protocol";
import { AskSession, SessionListener } from "@/domain/device/transport";

// An in-memory transport for the app/gateway side: receives frames (as if from
// a WebSocket/HTTP endpoint) and hands complete sessions to the processor.
// This is the seam where a real WSS/HTTPS server would plug in.
export class InMemoryDeviceTransport implements AskSessionTransport {
  readonly kind = "wifi_websocket";
  private listener?: SessionListener;
  private onFrame?: (frame: AskFrame) => void;

  onSession(listener: SessionListener): void {
    this.listener = listener;
  }

  async connect(): Promise<void> {}

  async send(packet: AskPacket): Promise<void> {
    this.onFrame?.(encodeFrame(packet));
  }

  async disconnect(): Promise<void> {}

  // Gateway hook: feed a raw frame into the transport.
  inject(frame: AskFrame): void {
    this.onFrame?.(frame);
  }

  // Called by the ingestion service to receive frames.
  _setFrameHandler(handler: (frame: AskFrame) => void): void {
    this.onFrame = handler;
  }

  _emit(session: AskSession): void {
    this.listener?.(session);
  }
}

export type AskSessionTransport = {
  kind: "wifi_websocket" | "wifi_http" | "ble";
  connect(): Promise<void>;
  send(packet: AskPacket): Promise<void>;
  disconnect(): Promise<void>;
  onSession(listener: SessionListener): void;
};
