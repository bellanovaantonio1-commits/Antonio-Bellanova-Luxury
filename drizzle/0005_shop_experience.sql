-- Shop experience upgrade: order tracking, saved addresses, wishlist alerts

ALTER TABLE orders ADD COLUMN IF NOT EXISTS tracking_number TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS carrier TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_method TEXT DEFAULT 'SHIPPING';

CREATE TABLE IF NOT EXISTS user_addresses (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  street TEXT NOT NULL,
  postal_code TEXT NOT NULL,
  city TEXT NOT NULL,
  country TEXT NOT NULL DEFAULT 'Deutschland',
  is_default TEXT DEFAULT 'false',
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_addresses_user_id ON user_addresses(user_id);

CREATE TABLE IF NOT EXISTS wishlist_alerts (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  product_id INTEGER REFERENCES products(id),
  notify_price_drop TEXT DEFAULT 'true',
  notify_back_in_stock TEXT DEFAULT 'true',
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_wishlist_alerts_user_product ON wishlist_alerts(user_id, product_id);
