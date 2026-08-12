import "../src/load-env.ts";

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createPgPool } from "../src/db/pool.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function migrate() {
  const pool = createPgPool();

  const migrations = ["0000_initial.sql", "0001_alter.sql", "0002_newsletter.sql"];

  console.log("Running database migrations...");
  for (const file of migrations) {
    const sqlPath = path.join(__dirname, "../drizzle", file);
    const sql = fs.readFileSync(sqlPath, "utf-8");
    await pool.query(sql);
    console.log(`Applied: ${file}`);
  }
  console.log("All migrations completed successfully.");
  await pool.end();
}

migrate().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
