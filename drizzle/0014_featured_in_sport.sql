ALTER TABLE products ADD COLUMN IF NOT EXISTS featured_in_sport boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS products_featured_in_sport_idx ON products (featured_in_sport) WHERE featured_in_sport = true;

-- Initial curation: only explicitly assigned sport watches (not name-based runtime filtering)
UPDATE products p
SET featured_in_sport = true
FROM brands b
WHERE p.brand_id = b.id
  AND b.name ILIKE '%cartier%'
  AND (
    p.name ILIKE '%tank%française%'
    OR p.name ILIKE '%tank%francaise%'
    OR p.title_de ILIKE '%tank%française%'
    OR p.title_de ILIKE '%tank%francaise%'
    OR p.title_en ILIKE '%tank%française%'
    OR p.title_en ILIKE '%tank%francaise%'
  )
  AND p.name NOT ILIKE '%américaine%'
  AND p.name NOT ILIKE '%americaine%'
  AND p.title_de NOT ILIKE '%américaine%'
  AND p.title_de NOT ILIKE '%americaine%';

UPDATE products p
SET featured_in_sport = true
FROM brands b
WHERE p.brand_id = b.id
  AND b.name ILIKE '%cartier%'
  AND (
    p.name ILIKE '%tank%américaine%mini%'
    OR p.name ILIKE '%tank%americaine%mini%'
    OR p.title_de ILIKE '%tank%américaine%mini%'
    OR p.title_de ILIKE '%tank%americaine%mini%'
    OR p.title_en ILIKE '%tank%américaine%mini%'
    OR p.title_en ILIKE '%tank%americaine%mini%'
  );

-- Explicit exclusion until reclassified in admin
UPDATE products
SET featured_in_sport = false
WHERE name ILIKE '%77580%'
   OR slug ILIKE '%77580%'
   OR model ILIKE '%77580%';
