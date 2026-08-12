import "../load-env.ts";

import pkg from "pg";
const { Pool } = pkg;

export function createPgPool() {
  const databaseUrl = process.env.DATABASE_URL?.trim();

  if (databaseUrl) {
    const isLocal =
      databaseUrl.includes("localhost") || databaseUrl.includes("127.0.0.1");
    const useSsl =
      !isLocal &&
      !databaseUrl.includes("render-internal.com") &&
      !databaseUrl.includes("sslmode=disable");
    return new Pool({
      connectionString: databaseUrl,
      ssl: useSsl ? { rejectUnauthorized: false } : false,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    });
  }

  console.warn(
    "DATABASE_URL is not set — falling back to local PostgreSQL (localhost:5432). " +
      "Set DATABASE_URL in .env for Neon/cloud database."
  );

  return new Pool({
    host: process.env.SQL_HOST,
    port: process.env.SQL_PORT ? parseInt(process.env.SQL_PORT, 10) : 5432,
    user: process.env.SQL_USER || process.env.SQL_ADMIN_USER,
    password: process.env.SQL_PASSWORD || process.env.SQL_ADMIN_PASSWORD,
    database: process.env.SQL_DB_NAME,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  });
}
