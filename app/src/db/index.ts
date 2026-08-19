import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { config } from '@/lib/config';
import * as schema from './schema';

/**
 * Single pooled client, cached across hot reloads in development so that
 * `next dev` does not exhaust the connection pool on every file change.
 */
const globalForDb = globalThis as unknown as {
  __pgClient?: ReturnType<typeof postgres>;
};

const client =
  globalForDb.__pgClient ??
  postgres(config.databaseUrl, {
    max: config.isProduction ? 10 : 3,
    prepare: false, // required for transaction-pooler setups (Supabase, pgBouncer)
  });

if (!config.isProduction) globalForDb.__pgClient = client;

export const db = drizzle(client, { schema });
export { schema };
