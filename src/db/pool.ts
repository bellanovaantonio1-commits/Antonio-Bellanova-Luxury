import pkg from "pg";
const { Pool } = pkg;

export function createPgPool() {
  const databaseUrl = process.env.DATABASE_URL;

  if (databaseUrl) {
    const isLocal = databaseUrl.includes("localhost") || databaseUrl.includes("127.0.0.1");
    return new Pool({
      connectionString: databaseUrl,
      ssl: isLocal ? false : { rejectUnauthorized: false },
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    });
  }

  return new Pool({
    host: process.env.SQL_HOST,
    port: process.env.SQL_PORT ? parseInt(process.env.SQL_PORT) : 5432,
    user: process.env.SQL_USER || process.env.SQL_ADMIN_USER,
    password: process.env.SQL_PASSWORD || process.env.SQL_ADMIN_PASSWORD,
    database: process.env.SQL_DB_NAME,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  });
}
