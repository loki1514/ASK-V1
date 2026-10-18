-- sqlite-vec virtual table for dense vector retrieval of memory text.
-- 384 dimensions = all-MiniLM-L6-v2 style on-device sentence embeddings.
-- Distance metric is cosine because embeddings are L2-normalized.

CREATE VIRTUAL TABLE IF NOT EXISTS embedding_records USING vec0(
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL,
  embedding FLOAT[384] DISTANCE_METRIC=COSINE,
  model_version TEXT NOT NULL,
  chunk_index INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_embedding_records_event ON embedding_records(event_id);
