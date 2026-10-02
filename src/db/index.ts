import { neonConfig, Pool as NeonPool } from "@neondatabase/serverless";
import { drizzle as drizzleNeon } from "drizzle-orm/neon-serverless";
import { drizzle as drizzleNodePg, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import ws from "ws";
import * as schema from "./schema";

export { schema };

/**
 * Both drivers expose the same Drizzle query builder; we type the client as the
 * node-postgres flavour so callers don't care which one is underneath.
 */
export type Database = NodePgDatabase<typeof schema>;

const globalForDb = globalThis as unknown as { __blognestDb?: { url: string; db: Database; end: () => Promise<void> } };

function connect(url: string) {
  // Neon in production (WebSocket pool, supports transactions); plain Postgres everywhere else.
  if (/\.neon\.tech[:/]/.test(url)) {
    neonConfig.webSocketConstructor = ws;
    const pool = new NeonPool({ connectionString: url });
    return { url, db: drizzleNeon(pool, { schema }) as unknown as Database, end: () => pool.end() };
  }
  const pool = new Pool({ connectionString: url, max: 5 });
  return { url, db: drizzleNodePg(pool, { schema }), end: () => pool.end() };
}

export function getDb(url = process.env.DATABASE_URL): Database {
  if (!url) throw new Error("DATABASE_URL is not set. Run `npm run db:local` and copy .env.example to .env.local.");
  if (!globalForDb.__blognestDb || globalForDb.__blognestDb.url !== url) globalForDb.__blognestDb = connect(url);
  return globalForDb.__blognestDb.db;
}

/** Close the pool (scripts and tests). */
export async function closeDb(): Promise<void> {
  await globalForDb.__blognestDb?.end();
  globalForDb.__blognestDb = undefined;
}
