-- Digitale Echtheitszertifikate

CREATE TABLE IF NOT EXISTS certificate_sequences (
  year INTEGER PRIMARY KEY,
  last_number INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS certificates (
  id SERIAL PRIMARY KEY,
  certificate_number TEXT NOT NULL UNIQUE,
  verification_code TEXT NOT NULL UNIQUE,
  product_id INTEGER NOT NULL REFERENCES products(id),
  order_id INTEGER REFERENCES orders(id),
  order_item_id INTEGER REFERENCES order_items(id),
  customer_id TEXT,
  status TEXT NOT NULL DEFAULT 'DRAFT',
  language TEXT NOT NULL DEFAULT 'de',
  issued_at TIMESTAMP,
  replaced_by_id INTEGER REFERENCES certificates(id),
  snapshot_data JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_certificates_product_id ON certificates(product_id);
CREATE INDEX IF NOT EXISTS idx_certificates_order_id ON certificates(order_id);
CREATE INDEX IF NOT EXISTS idx_certificates_customer_id ON certificates(customer_id);
CREATE INDEX IF NOT EXISTS idx_certificates_status ON certificates(status);
CREATE INDEX IF NOT EXISTS idx_certificates_certificate_number ON certificates(certificate_number);

CREATE TABLE IF NOT EXISTS certificate_audit (
  id SERIAL PRIMARY KEY,
  certificate_id INTEGER NOT NULL REFERENCES certificates(id) ON DELETE CASCADE,
  changed_at TIMESTAMP DEFAULT NOW() NOT NULL,
  admin_uid TEXT NOT NULL,
  admin_name TEXT,
  admin_email TEXT,
  field_name TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT
);

CREATE INDEX IF NOT EXISTS idx_certificate_audit_certificate_id ON certificate_audit(certificate_id);
