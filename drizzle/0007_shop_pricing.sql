-- Basispreis (Vorkasse-Auszahlung) vs. Shop-Preis (Stripe-Anzeige)

ALTER TABLE products ADD COLUMN IF NOT EXISTS base_price NUMERIC(10, 2);

COMMENT ON COLUMN products.base_price IS 'Betrag den der Händler bei Vorkasse/Banküberweisung erhält. NULL = Legacy (price ist Shop- und Basispreis).';
COMMENT ON COLUMN products.price IS 'Gerundeter Shop-Preis für Anzeige und Stripe-Zahlung.';
