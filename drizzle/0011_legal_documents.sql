-- Zentrale Rechtstexte mit Versionierung

CREATE TABLE IF NOT EXISTS legal_documents (
  id SERIAL PRIMARY KEY,
  document_key TEXT NOT NULL,
  language TEXT NOT NULL DEFAULT 'de',
  version INTEGER NOT NULL,
  title TEXT NOT NULL,
  content_html TEXT NOT NULL,
  change_note TEXT,
  admin_uid TEXT,
  admin_name TEXT,
  admin_email TEXT,
  is_active BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE (document_key, language, version)
);

CREATE INDEX IF NOT EXISTS idx_legal_documents_active
  ON legal_documents (document_key, language, is_active);

CREATE INDEX IF NOT EXISTS idx_legal_documents_key_lang
  ON legal_documents (document_key, language);

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS legal_acceptance_snapshot JSONB;
