-- Invoice numbering (race-safe per year)
CREATE TABLE IF NOT EXISTS invoice_sequences (
  year INTEGER PRIMARY KEY,
  last_number INTEGER NOT NULL DEFAULT 0
);

-- Invoices linked 1:1 to orders
CREATE TABLE IF NOT EXISTS invoices (
  id SERIAL PRIMARY KEY,
  invoice_number TEXT NOT NULL UNIQUE,
  order_id INTEGER NOT NULL UNIQUE REFERENCES orders(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  language TEXT NOT NULL DEFAULT 'de',
  customer_email TEXT,
  customer_name TEXT,
  company_name TEXT,
  customer_vat_id TEXT,
  billing_address JSONB,
  shipping_address JSONB,
  line_items JSONB NOT NULL,
  seller_snapshot JSONB NOT NULL,
  subtotal_net NUMERIC(10, 2) NOT NULL,
  tax_amount NUMERIC(10, 2) NOT NULL DEFAULT 0,
  shipping_cost NUMERIC(10, 2) NOT NULL DEFAULT 0,
  discount_amount NUMERIC(10, 2) NOT NULL DEFAULT 0,
  total_gross NUMERIC(10, 2) NOT NULL,
  tax_rate_percent NUMERIC(5, 2) DEFAULT 19,
  tax_note TEXT,
  currency TEXT NOT NULL DEFAULT 'EUR',
  payment_method TEXT,
  payment_status TEXT,
  order_number TEXT,
  e_invoice_format TEXT,
  e_invoice_metadata JSONB,
  issued_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_invoices_order_id ON invoices(order_id);
CREATE INDEX IF NOT EXISTS idx_invoices_user_id ON invoices(user_id);
CREATE INDEX IF NOT EXISTS idx_invoices_issued_at ON invoices(issued_at DESC);

-- Order extensions for checkout / B2B
ALTER TABLE orders ADD COLUMN IF NOT EXISTS billing_address JSONB;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'de';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_name TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS company_name TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_vat_id TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_cost NUMERIC(10, 2) DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(10, 2) DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS subtotal_net NUMERIC(10, 2);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS tax_amount NUMERIC(10, 2);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS tax_rate_percent NUMERIC(5, 2) DEFAULT 19;

-- Line item snapshots for invoices
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS product_sku TEXT;
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS unit_price_gross NUMERIC(10, 2);
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS unit_price_net NUMERIC(10, 2);
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS line_tax_amount NUMERIC(10, 2);
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS tax_rate_percent NUMERIC(5, 2);
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS tax_treatment TEXT;
