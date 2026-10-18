-- FTS5 virtual table for lexical search over canonical memories.
-- content='' means we store the index only; the source of truth stays in
-- canonical_events and event_evidence tables.

CREATE VIRTUAL TABLE IF NOT EXISTS memory_documents USING fts5(
  event_id UNINDEXED,
  title,
  object_text,
  evidence_text,
  content='',
  tokenize='porter unicode61'
);

-- Upsert a memory document from a canonical event and its evidence.
CREATE TRIGGER IF NOT EXISTS trg_memory_documents_insert
AFTER INSERT ON canonical_events
BEGIN
  INSERT INTO memory_documents(event_id, title, object_text, evidence_text)
  VALUES (
    NEW.id,
    NEW.title,
    NEW.object_text,
    COALESCE((
      SELECT group_concat(ee.quoted_text, ' ')
      FROM event_evidence ee
      WHERE ee.event_id = NEW.id
    ), '')
  );
END;

-- Update the memory document when a canonical event is updated.
CREATE TRIGGER IF NOT EXISTS trg_memory_documents_update
AFTER UPDATE ON canonical_events
BEGIN
  DELETE FROM memory_documents WHERE event_id = NEW.id;
  INSERT INTO memory_documents(event_id, title, object_text, evidence_text)
  VALUES (
    NEW.id,
    NEW.title,
    NEW.object_text,
    COALESCE((
      SELECT group_concat(ee.quoted_text, ' ')
      FROM event_evidence ee
      WHERE ee.event_id = NEW.id
    ), '')
  );
END;

-- Remove the memory document when a canonical event is deleted.
CREATE TRIGGER IF NOT EXISTS trg_memory_documents_delete
AFTER DELETE ON canonical_events
BEGIN
  DELETE FROM memory_documents WHERE event_id = OLD.id;
END;
