import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import type { Pool } from "pg";
import * as schema from "./schema.ts";
import { createPgPool } from "./pool.ts";

type Db = NodePgDatabase<typeof schema>;

declare global {
  var _postgresPool: Pool | undefined;
  var _drizzleDb: Db | undefined;
}

function getPool(): Pool {
  if (!global._postgresPool) {
    global._postgresPool = createPgPool();
    global._postgresPool.on("error", (err: unknown) => {
      console.error("Unexpected error on idle SQL pool client:", err);
    });
  }
  return global._postgresPool;
}

function getDb(): Db {
  if (!global._drizzleDb) {
    global._drizzleDb = drizzle(getPool(), { schema });
  }
  return global._drizzleDb;
}

/** @deprecated use `getDb()` — kept for backwards compatibility */
export const createPool = getPool;

export const db = new Proxy({} as Db, {
  get(_target, prop, receiver) {
    const instance = getDb();
    const value = Reflect.get(instance, prop, receiver);
    return typeof value === "function" ? value.bind(instance) : value;
  },
});
