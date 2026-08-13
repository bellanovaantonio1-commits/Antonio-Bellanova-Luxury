import { defineConfig } from "drizzle-kit";
import * as dotenv from "dotenv";

dotenv.config();

const databaseUrl = process.env.DATABASE_URL?.trim();

function getDbCredentials() {
  if (databaseUrl) {
    return { url: databaseUrl };
  }

  const host = process.env.SQL_HOST;
  const database = process.env.SQL_DB_NAME;
  const user = process.env.SQL_ADMIN_USER || process.env.SQL_USER;
  const password = process.env.SQL_ADMIN_PASSWORD || process.env.SQL_PASSWORD;

  if (!host || !database || !user || !password) {
    throw new Error(
      "Missing DB config: set DATABASE_URL or SQL_HOST, SQL_DB_NAME, SQL_ADMIN_USER, SQL_ADMIN_PASSWORD in .env"
    );
  }

  return {
    host,
    database,
    user,
    password,
    ssl: false,
  };
}

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: getDbCredentials(),
  verbose: true,
});
