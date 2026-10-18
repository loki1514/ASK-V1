-- Local sync queue and verified cloud receipts.
-- The SyncEngine writes here; a cloud adapter (Supabase, etc.) reads QUEUED
-- rows, uploads encrypted payloads, and writes back receipts.

CREATE TABLE IF NOT EXISTS sync_jobs (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL REFERENCES canonical_events(id) ON DELETE CASCADE,
  idempotency_key TEXT NOT NULL,
  payload_hash TEXT NOT NULL,
  state TEXT NOT NULL DEFAULT 'QUEUED'
    CHECK(state IN ('LOCAL','QUEUED','TRANSFERRING','PROCESSING','SYNCED','RETRY_PENDING','FAILED')),
  retry_count INTEGER NOT NULL DEFAULT 0,
  last_attempt_ms INTEGER,
  receipt_id TEXT,
  error TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS cloud_receipts (
  id TEXT PRIMARY KEY,
  sync_job_id TEXT NOT NULL REFERENCES sync_jobs(id),
  event_id TEXT NOT NULL,
  server_payload_hash TEXT NOT NULL,
  server_timestamp TEXT NOT NULL,
  verified_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_sync_jobs_state ON sync_jobs(state);
CREATE INDEX IF NOT EXISTS idx_sync_jobs_event ON sync_jobs(event_id);
CREATE INDEX IF NOT EXISTS idx_cloud_receipts_event ON cloud_receipts(event_id);
