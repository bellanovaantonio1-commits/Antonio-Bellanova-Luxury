-- Invoice status, cancellation, credit notes (Stornorechnungen)

ALTER TABLE invoices ADD COLUMN IF NOT EXISTS invoice_type TEXT NOT NULL DEFAULT 'INVOICE';
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS invoice_status TEXT NOT NULL DEFAULT 'ISSUED';
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMP;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS original_invoice_id INTEGER REFERENCES invoices(id);

CREATE TABLE IF NOT EXISTS credit_note_sequences (
  year INTEGER PRIMARY KEY,
  last_number INTEGER NOT NULL DEFAULT 0
);

-- Backfill existing rows
UPDATE invoices SET invoice_type = 'INVOICE' WHERE invoice_type IS NULL OR invoice_type = '';
UPDATE invoices SET invoice_status = 'ISSUED' WHERE invoice_status IS NULL OR invoice_status = '';

-- One INVOICE per order (credit notes may share order_id)
ALTER TABLE invoices DROP CONSTRAINT IF EXISTS invoices_order_id_key;

CREATE UNIQUE INDEX IF NOT EXISTS idx_invoices_one_invoice_per_order
  ON invoices(order_id) WHERE invoice_type = 'INVOICE';

CREATE UNIQUE INDEX IF NOT EXISTS idx_credit_note_one_per_invoice
  ON invoices(original_invoice_id) WHERE invoice_type = 'CREDIT_NOTE';

CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(invoice_status);
CREATE INDEX IF NOT EXISTS idx_invoices_type ON invoices(invoice_type);
