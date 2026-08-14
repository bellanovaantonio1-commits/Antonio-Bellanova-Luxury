import "../src/load-env.ts";

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createPgPool } from "../src/db/pool.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function migrate() {
  const pool = createPgPool();

  const migrations = [
    "0000_initial.sql",
    "0001_alter.sql",
    "0002_newsletter.sql",
    "0003_invoices.sql",
    "0004_invoice_status.sql",
    "0005_shop_experience.sql",
    "0006_stripe.sql",
    "0007_shop_pricing.sql",
    "0008_pricing_models.sql",
    "0009_pricing_payments_admin.sql",
    "0010_certificates.sql",
    "0011_legal_documents.sql",
    "0012_certificate_order_item_unique.sql",
    "0013_featured_in_hero.sql",
  ];

  console.log("Running database migrations...");
  for (const file of migrations) {
    const sqlPath = path.join(__dirname, "../drizzle", file);
    const sql = fs.readFileSync(sqlPath, "utf-8");
    await pool.query(sql);
    console.log(`Applied: ${file}`);
  }
  console.log("All migrations completed successfully.");
  const { ensureLegalDefaults } = await import("../src/server/legal/service.ts");
  await ensureLegalDefaults();
  console.log("Legal document defaults ensured.");
  await pool.end();
}

migrate().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
