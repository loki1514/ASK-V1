-- ASK on-device SQLite schema: core tables
-- Foreign keys and WAL mode are set by the bootstrapper before migrations run.

-- conversations -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS conversations (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  source TEXT NOT NULL CHECK(source IN ('clean','dirty','pasted','file','recorded')),
  recorded_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  sync_state TEXT NOT NULL DEFAULT 'LOCAL' CHECK(sync_state IN ('LOCAL','QUEUED','SYNCED','FAILED')),
  cloud_receipt_id TEXT
);

-- audio_artifacts ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS audio_artifacts (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  filename TEXT,
  mime_type TEXT NOT NULL DEFAULT 'audio/wav',
  duration_ms INTEGER,
  sample_rate INTEGER NOT NULL,
  channels INTEGER NOT NULL DEFAULT 1,
  local_uri TEXT NOT NULL,
  encryption_version TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- audio_chunks ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS audio_chunks (
  id TEXT PRIMARY KEY,
  artifact_id TEXT NOT NULL REFERENCES audio_artifacts(id) ON DELETE CASCADE,
  sequence INTEGER NOT NULL,
  byte_offset INTEGER NOT NULL,
  byte_length INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(artifact_id, sequence)
);

-- transcript_segments -----------------------------------------------------
CREATE TABLE IF NOT EXISTS transcript_segments (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  start_ms INTEGER NOT NULL,
  end_ms INTEGER NOT NULL,
  text TEXT NOT NULL,
  speaker_name TEXT,
  anonymous_speaker_id TEXT,
  resolved_speaker_id TEXT,
  confidence REAL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- anonymous_speakers ------------------------------------------------------
CREATE TABLE IF NOT EXISTS anonymous_speakers (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  local_index INTEGER NOT NULL
);

-- voice_profiles ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS voice_profiles (
  id TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  owner INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL CHECK(status IN ('enrolling','calibrating','active','needs_reenrollment','deleted')),
  model_version TEXT NOT NULL,
  preprocessing_version TEXT NOT NULL,
  threshold_profile_id TEXT,
  centroid BLOB,
  self_consistency REAL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- voice_templates ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS voice_templates (
  id TEXT PRIMARY KEY,
  profile_id TEXT NOT NULL REFERENCES voice_profiles(id) ON DELETE CASCADE,
  source_duration_ms INTEGER NOT NULL,
  embedding BLOB NOT NULL,
  model_version TEXT NOT NULL,
  preprocessing_version TEXT NOT NULL,
  quality_json TEXT NOT NULL,
  created_at TEXT NOT NULL
);

-- threshold_profiles ------------------------------------------------------
CREATE TABLE IF NOT EXISTS threshold_profiles (
  id TEXT PRIMARY KEY,
  model_version TEXT NOT NULL,
  preprocessing_version TEXT NOT NULL,
  platform TEXT NOT NULL CHECK(platform IN ('ios','android','cross_platform')),
  accept_threshold REAL NOT NULL,
  ambiguity_margin REAL NOT NULL,
  method TEXT NOT NULL CHECK(method IN ('eer','min_dcf','bootstrap')),
  metrics_json TEXT NOT NULL,
  evaluation_set_id TEXT NOT NULL,
  created_at TEXT NOT NULL
);

-- speaker_decisions -------------------------------------------------------
CREATE TABLE IF NOT EXISTS speaker_decisions (
  id TEXT PRIMARY KEY,
  sample_id TEXT NOT NULL,
  outcome TEXT NOT NULL CHECK(outcome IN ('verified','unknown','ambiguous','rejected_quality')),
  candidate_profile_id TEXT REFERENCES voice_profiles(id),
  cosine_score REAL,
  threshold_profile_id TEXT REFERENCES threshold_profiles(id),
  alternatives_json TEXT NOT NULL,
  model_version TEXT NOT NULL,
  preprocessing_version TEXT NOT NULL,
  reason_code TEXT NOT NULL,
  created_at TEXT NOT NULL
);

-- semantic_event_drafts ---------------------------------------------------
CREATE TABLE IF NOT EXISTS semantic_event_drafts (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  proposed_type TEXT NOT NULL,
  proposed_function TEXT NOT NULL,
  title TEXT NOT NULL,
  object_text TEXT NOT NULL,
  actor TEXT,
  people_json TEXT NOT NULL,
  project TEXT,
  deadline_at TEXT,
  status TEXT,
  parser_confidence REAL NOT NULL,
  parser_model_version TEXT NOT NULL,
  evidence_json TEXT NOT NULL,
  warnings_json TEXT NOT NULL,
  idempotency_key TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- guard_decisions ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS guard_decisions (
  id TEXT PRIMARY KEY,
  draft_id TEXT NOT NULL REFERENCES semantic_event_drafts(id) ON DELETE CASCADE,
  outcome TEXT NOT NULL CHECK(outcome IN ('allow_commit','require_review','deny')),
  rule_results_json TEXT NOT NULL,
  normalized_fields_json TEXT NOT NULL,
  required_confirmation TEXT NOT NULL,
  policy_version TEXT NOT NULL,
  created_at TEXT NOT NULL
);

-- canonical_events --------------------------------------------------------
CREATE TABLE IF NOT EXISTS canonical_events (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  function_name TEXT NOT NULL,
  title TEXT NOT NULL,
  object_text TEXT NOT NULL,
  actor TEXT,
  people_json TEXT NOT NULL,
  project TEXT,
  deadline_at TEXT,
  status TEXT NOT NULL,
  confidence_parser REAL NOT NULL,
  confidence_aggregate REAL NOT NULL,
  guard_decision_id TEXT NOT NULL REFERENCES guard_decisions(id),
  parser_model_version TEXT NOT NULL,
  schema_version INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  supersedes_event_id TEXT REFERENCES canonical_events(id),
  idempotency_key TEXT NOT NULL UNIQUE,
  sync_state TEXT NOT NULL DEFAULT 'LOCAL' CHECK(sync_state IN ('LOCAL','QUEUED','SYNCED','FAILED'))
);

-- event_evidence ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS event_evidence (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL REFERENCES canonical_events(id) ON DELETE CASCADE,
  transcript_segment_id TEXT NOT NULL REFERENCES transcript_segments(id) ON DELETE CASCADE,
  start_char INTEGER NOT NULL,
  end_char INTEGER NOT NULL,
  start_ms INTEGER NOT NULL,
  end_ms INTEGER NOT NULL,
  quoted_text TEXT NOT NULL
);

-- entities ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS entities (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL CHECK(kind IN ('person','project','organization','location','topic')),
  canonical_name TEXT NOT NULL,
  aliases_json TEXT NOT NULL,
  first_seen_at TEXT NOT NULL,
  last_seen_at TEXT NOT NULL
);

-- event_entities ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS event_entities (
  event_id TEXT NOT NULL REFERENCES canonical_events(id) ON DELETE CASCADE,
  entity_id TEXT NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'mentioned',
  PRIMARY KEY (event_id, entity_id)
);

-- action_executions ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS action_executions (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL REFERENCES canonical_events(id) ON DELETE CASCADE,
  function_name TEXT NOT NULL,
  confirmation_state TEXT NOT NULL DEFAULT 'none',
  executed_at TEXT,
  result_json TEXT,
  error TEXT
);

-- model_manifests -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS model_manifests (
  id TEXT PRIMARY KEY,
  role TEXT NOT NULL CHECK(role IN ('asr','vad','speaker_embedding','semantic_parser','text_embedding','reranker')),
  model_version TEXT NOT NULL,
  asset_uri TEXT,
  sha256 TEXT,
  active INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(role, model_version)
);

-- audit_log -----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS audit_log (
  id TEXT PRIMARY KEY,
  table_name TEXT NOT NULL,
  row_id TEXT NOT NULL,
  operation TEXT NOT NULL CHECK(operation IN ('INSERT','UPDATE','DELETE')),
  actor TEXT,
  diff_json TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- useful indexes ------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_canonical_events_conversation ON canonical_events(conversation_id);
CREATE INDEX IF NOT EXISTS idx_canonical_events_idempotency ON canonical_events(idempotency_key);
CREATE INDEX IF NOT EXISTS idx_canonical_events_sync_state ON canonical_events(sync_state);
CREATE INDEX IF NOT EXISTS idx_event_evidence_event ON event_evidence(event_id);
CREATE INDEX IF NOT EXISTS idx_transcript_segments_conversation ON transcript_segments(conversation_id);
CREATE INDEX IF NOT EXISTS idx_entities_name ON entities(canonical_name);
CREATE INDEX IF NOT EXISTS idx_audit_log_row ON audit_log(table_name, row_id);
