/**
 * Event-Based Sync Engine (Phase 5)
 * Manages reliable offline-first synchronization between local Canonical Events
 * and cloud verification receipts.
 */

export type SyncState = "LOCAL" | "QUEUED" | "TRANSFERRING" | "PROCESSING" | "SYNCED" | "RETRY_PENDING" | "FAILED";

export interface SyncQueueItem {
  id: string;
  eventId: string;
  idempotencyKey: string;
  payloadHash: string;
  state: SyncState;
  retryCount: number;
  lastAttemptMs: number;
  receiptId?: string;
  error?: string;
}

export class SyncEngine {
  private queue: Map<string, SyncQueueItem>;
  private maxRetries: number;

  constructor(maxRetries: number = 3) {
    this.queue = new Map();
    this.maxRetries = maxRetries;
  }

  /**
   * Enqueues a canonical event for background cloud verification.
   */
  public enqueue(eventId: string, idempotencyKey: string, payloadHash: string): SyncQueueItem {
    const existing = this.queue.get(eventId);
    if (existing && existing.state === "SYNCED") {
      return existing;
    }

    const item: SyncQueueItem = {
      id: `sync_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      eventId,
      idempotencyKey,
      payloadHash,
      state: "QUEUED",
      retryCount: 0,
      lastAttemptMs: Date.now(),
    };

    this.queue.set(eventId, item);
    return item;
  }

  /**
   * Advances the queue items through state transitions.
   */
  public async processQueue(
    uploader: (item: SyncQueueItem) => Promise<{ receiptId: string }>,
  ): Promise<SyncQueueItem[]> {
    const processed: SyncQueueItem[] = [];

    for (const item of this.queue.values()) {
      if (item.state !== "QUEUED" && item.state !== "RETRY_PENDING") {
        continue;
      }

      item.state = "TRANSFERRING";
      item.lastAttemptMs = Date.now();

      try {
        item.state = "PROCESSING";
        const result = await uploader(item);
        item.state = "SYNCED";
        item.receiptId = result.receiptId;
        item.error = undefined;
      } catch (err: any) {
        item.retryCount++;
        if (item.retryCount >= this.maxRetries) {
          item.state = "FAILED";
          item.error = err?.message ?? "Max retries exceeded";
        } else {
          item.state = "RETRY_PENDING";
          item.error = err?.message ?? "Temporary network interruption";
        }
      }

      processed.push({ ...item });
    }

    return processed;
  }

  public getItem(eventId: string): SyncQueueItem | undefined {
    return this.queue.get(eventId);
  }

  public listQueue(): SyncQueueItem[] {
    return Array.from(this.queue.values());
  }

  public clear(): void {
    this.queue.clear();
  }
}

export const syncEngine = new SyncEngine();
