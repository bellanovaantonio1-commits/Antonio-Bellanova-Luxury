import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from './schema.ts';
import { createPgPool } from './pool.ts';

declare global {
  var _postgresPool: ReturnType<typeof createPgPool> | undefined;
}

export const createPool = () => {
  if (!global._postgresPool) {
    global._postgresPool = createPgPool();
    global._postgresPool.on('error', (err: unknown) => {
      console.error('Unexpected error on idle SQL pool client:', err);
    });
  }
  return global._postgresPool;
};

const pool = createPool();
export const db = drizzle(pool, { schema });
