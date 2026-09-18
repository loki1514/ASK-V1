import { describe, expect, it } from "vitest";
import { SyncEngine } from "./SyncEngine";
import { encryptAudioPayload, computeSha256Hash, generateCloudReceipt } from "../crypto/audioEncryption";

describe("Sync & Encryption Subsystem (Phase 5)", () => {
  it("computes deterministic SHA-256 hash", () => {
    const data = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]);
    const hash1 = computeSha256Hash(data);
    const hash2 = computeSha256Hash(data);

    expect(hash1.length).toBe(64);
    expect(hash1).toBe(hash2);
  });

  it("encrypts audio payload into an AES-256-GCM envelope", () => {
    const rawAudio = new Uint8Array(512);
    for (let i = 0; i < 512; i++) rawAudio[i] = i % 256;

    const envelope = encryptAudioPayload(rawAudio, "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef");
    expect(envelope.algorithm).toBe("AES-256-GCM");
    expect(envelope.ciphertextBase64.length).toBeGreaterThan(0);
    expect(envelope.ivHex.length).toBe(24); // 12 bytes = 24 hex chars
    expect(envelope.sha256PayloadHash.length).toBe(64);
  });

  it("generates signed cloud verification receipt", () => {
    const receipt = generateCloudReceipt("event_123", "hash_abc");
    expect(receipt.eventId).toBe("event_123");
    expect(receipt.status).toBe("verified");
    expect(receipt.signature.startsWith("sig_")).toBe(true);
  });

  it("manages sync state machine transitions and retry handling", async () => {
    const engine = new SyncEngine(2);
    engine.enqueue("event_1", "idemp_1", "hash_1");

    expect(engine.getItem("event_1")?.state).toBe("QUEUED");

    // Process with successful upload
    await engine.processQueue(async (item) => {
      return { receiptId: "rcpt_999" };
    });

    expect(engine.getItem("event_1")?.state).toBe("SYNCED");
    expect(engine.getItem("event_1")?.receiptId).toBe("rcpt_999");
  });

  it("handles network failures and marks state as RETRY_PENDING / FAILED", async () => {
    const engine = new SyncEngine(2);
    engine.enqueue("event_fail", "idemp_fail", "hash_fail");

    // 1st failure -> RETRY_PENDING
    await engine.processQueue(async () => {
      throw new Error("Network timeout");
    });
    expect(engine.getItem("event_fail")?.state).toBe("RETRY_PENDING");
    expect(engine.getItem("event_fail")?.retryCount).toBe(1);

    // 2nd failure -> exceeds max retries (2) -> FAILED
    await engine.processQueue(async () => {
      throw new Error("Network timeout");
    });
    expect(engine.getItem("event_fail")?.state).toBe("FAILED");
    expect(engine.getItem("event_fail")?.retryCount).toBe(2);
  });
});
