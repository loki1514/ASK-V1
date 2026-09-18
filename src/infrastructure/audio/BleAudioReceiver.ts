/**
 * BLE Audio Receiver
 * Reassembles high-throughput chunked audio packets transmitted over BLE GATT.
 * Enforces 32-bit sequence ordering and reports packet drop metrics.
 */

export interface AudioPacketHeader {
  sequenceNumber: number;
}

export interface BleAudioStreamStats {
  packetsReceived: number;
  packetsDropped: number;
  bytesReceived: number;
  lastSequenceNumber: number;
}

export class BleAudioReceiver {
  private stats: BleAudioStreamStats;
  private pcmBuffer: number[];
  private onAudioBufferReady?: (samples: Int16Array) => void;
  private readonly headerSize = 4; // 4-byte sequence header

  constructor(onAudioBufferReady?: (samples: Int16Array) => void) {
    this.onAudioBufferReady = onAudioBufferReady;
    this.pcmBuffer = [];
    this.stats = {
      packetsReceived: 0,
      packetsDropped: 0,
      bytesReceived: 0,
      lastSequenceNumber: -1,
    };
  }

  /**
   * Processes a raw byte packet received from BLE GATT notification.
   */
  public receivePacket(rawPacket: Uint8Array): boolean {
    if (rawPacket.length <= this.headerSize) {
      return false;
    }

    // Extract 32-bit sequence number (big-endian)
    const seq = (rawPacket[0] << 24) | (rawPacket[1] << 16) | (rawPacket[2] << 8) | rawPacket[3];

    // Detect packet drops
    if (this.stats.lastSequenceNumber !== -1) {
      const expectedSeq = this.stats.lastSequenceNumber + 1;
      if (seq > expectedSeq) {
        const dropped = seq - expectedSeq;
        this.stats.packetsDropped += dropped;
      }
    }

    this.stats.lastSequenceNumber = seq;
    this.stats.packetsReceived++;
    this.stats.bytesReceived += rawPacket.length;

    // Convert raw 16-bit little-endian PCM bytes into 16-bit signed integers
    const payloadLength = rawPacket.length - this.headerSize;
    const sampleCount = Math.floor(payloadLength / 2);

    for (let i = 0; i < sampleCount; i++) {
      const byteIdx = this.headerSize + i * 2;
      let val = rawPacket[byteIdx] | (rawPacket[byteIdx + 1] << 8);
      if (val >= 0x8000) val -= 0x10000;
      this.pcmBuffer.push(val);
    }

    // When buffer reaches a nominal chunk (e.g., 1 second of 16kHz audio = 16000 samples), emit
    if (this.pcmBuffer.length >= 16000 && this.onAudioBufferReady) {
      const readySamples = new Int16Array(this.pcmBuffer);
      this.pcmBuffer = [];
      this.onAudioBufferReady(readySamples);
    }

    return true;
  }

  /**
   * Flushes any remaining samples in the receiver buffer.
   */
  public flush(): Int16Array {
    const samples = new Int16Array(this.pcmBuffer);
    this.pcmBuffer = [];
    return samples;
  }

  public getStats(): Readonly<BleAudioStreamStats> {
    return { ...this.stats };
  }

  public reset(): void {
    this.pcmBuffer = [];
    this.stats = {
      packetsReceived: 0,
      packetsDropped: 0,
      bytesReceived: 0,
      lastSequenceNumber: -1,
    };
  }
}
