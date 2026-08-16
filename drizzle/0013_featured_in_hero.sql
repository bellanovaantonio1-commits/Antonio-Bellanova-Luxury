ALTER TABLE products ADD COLUMN IF NOT EXISTS featured_in_hero boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS products_featured_in_hero_idx ON products (featured_in_hero) WHERE featured_in_hero = true;
