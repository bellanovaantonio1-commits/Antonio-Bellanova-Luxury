ALTER TABLE products ADD COLUMN IF NOT EXISTS featured_in_vintage boolean NOT NULL DEFAULT false;
ALTER TABLE products ADD COLUMN IF NOT EXISTS featured_in_under_5000 boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS products_featured_in_vintage_idx ON products (featured_in_vintage) WHERE featured_in_vintage = true;
CREATE INDEX IF NOT EXISTS products_featured_in_under_5000_idx ON products (featured_in_under_5000) WHERE featured_in_under_5000 = true;
