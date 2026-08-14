-- Preismodelle & erweiterte Preisfelder

ALTER TABLE products ADD COLUMN IF NOT EXISTS pricing_model TEXT DEFAULT 'STANDARD';
ALTER TABLE products ADD COLUMN IF NOT EXISTS fixed_sale_price NUMERIC(10, 2);
ALTER TABLE products ADD COLUMN IF NOT EXISTS calculated_stripe_price NUMERIC(10, 2);
ALTER TABLE products ADD COLUMN IF NOT EXISTS rounded_shop_price NUMERIC(10, 2);
ALTER TABLE products ADD COLUMN IF NOT EXISTS bank_transfer_discount NUMERIC(10, 2) DEFAULT '0';

-- Bestehende Produkte: Standardpreis beibehalten
UPDATE products
SET pricing_model = 'STANDARD',
    fixed_sale_price = price,
    rounded_shop_price = price,
    bank_transfer_discount = '0'
WHERE pricing_model IS NULL OR fixed_sale_price IS NULL;

-- Order-Item-Snapshot (Preise zum Bestellzeitpunkt)
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS pricing_model TEXT;
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS shop_unit_price_gross NUMERIC(10, 2);
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS base_price_snapshot NUMERIC(10, 2);
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS prepayment_discount_snapshot NUMERIC(10, 2) DEFAULT '0';

ALTER TABLE orders ADD COLUMN IF NOT EXISTS shop_subtotal_gross NUMERIC(10, 2);
