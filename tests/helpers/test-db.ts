import path from "node:path";
import { sql } from "drizzle-orm";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { getDb, type Database } from "@/db";

/** Separate database for tests: never the dev or production one. */
export const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL ?? "postgres://postgres@localhost:54329/blognest_test";

const TABLES = [
  "sessions", "invites", "user_prefs", "audit_log", "daily_stats", "rate_limits", "media", "messages",
  "subscribers", "settings", "articles", "jobs", "authors", "categories", "users",
];

/** Points the app at the test database and applies migrations. */
export async function useTestDb(): Promise<Database> {
  if (/neon\.tech/.test(TEST_DATABASE_URL)) throw new Error("Tests must not run against Neon.");
  process.env.DATABASE_URL = TEST_DATABASE_URL;
  const db = getDb(TEST_DATABASE_URL);
  await migrate(db, { migrationsFolder: path.join(process.cwd(), "src/db/migrations") });
  return db;
}

export async function resetTestDb(db: Database): Promise<void> {
  await db.execute(sql.raw(`truncate ${TABLES.map((t) => `"${t}"`).join(", ")} restart identity cascade`));
}
