-- Idempotenz: maximal ein Zertifikat pro Bestellposition
CREATE UNIQUE INDEX IF NOT EXISTS idx_certificates_order_item_id_unique
  ON certificates (order_item_id)
  WHERE order_item_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_certificates_order_item_id ON certificates (order_item_id);
