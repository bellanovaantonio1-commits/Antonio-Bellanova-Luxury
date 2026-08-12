-- Add new columns to existing tables (safe to run multiple times)

ALTER TABLE orders ADD COLUMN IF NOT EXISTS order_number TEXT UNIQUE;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'PENDING';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'BANK_TRANSFER';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_address JSONB;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

ALTER TABLE order_items ADD COLUMN IF NOT EXISTS product_name TEXT;
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS product_image TEXT;

CREATE TABLE IF NOT EXISTS shop_settings (
  id SERIAL PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  value JSONB NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS inquiries (
  id SERIAL PRIMARY KEY,
  type TEXT NOT NULL,
  status TEXT DEFAULT 'NEW',
  first_name TEXT,
  last_name TEXT,
  email TEXT NOT NULL,
  phone TEXT,
  subject TEXT,
  message TEXT,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS wishlist_items (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  product_id INTEGER REFERENCES products(id),
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, product_id)
);
