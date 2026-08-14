-- Preise & Zahlungen: Audit-Log + erweiterte Einstellungen

CREATE TABLE IF NOT EXISTS pricing_settings_audit (
  id SERIAL PRIMARY KEY,
  changed_at TIMESTAMP DEFAULT NOW() NOT NULL,
  admin_uid TEXT NOT NULL,
  admin_name TEXT,
  admin_email TEXT,
  setting_key TEXT NOT NULL,
  setting_label TEXT,
  old_value TEXT,
  new_value TEXT
);

CREATE INDEX IF NOT EXISTS idx_pricing_settings_audit_changed_at ON pricing_settings_audit (changed_at DESC);
