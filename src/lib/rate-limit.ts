import "server-only";
import { createHash } from "node:crypto";
import { sql } from "drizzle-orm";
import { getDb } from "@/db";

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
}

/**
 * Fixed-window rate limit stored in Postgres, so it holds across serverless
 * instances. One atomic upsert per call.
 */
export async function rateLimit(key: string, limit: number, windowSeconds: number): Promise<RateLimitResult> {
  const result = await getDb().execute<{ count: number; window_start: Date | string }>(sql`
    insert into rate_limits (key, count, window_start) values (${key}, 1, now())
    on conflict (key) do update set
      count = case when rate_limits.window_start <= now() - make_interval(secs => ${windowSeconds}) then 1 else rate_limits.count + 1 end,
      window_start = case when rate_limits.window_start <= now() - make_interval(secs => ${windowSeconds}) then now() else rate_limits.window_start end
    returning count, window_start
  `);
  const row = result.rows[0];
  const count = Number(row.count);
  return {
    allowed: count <= limit,
    remaining: Math.max(0, limit - count),
    resetAt: new Date(new Date(row.window_start).getTime() + windowSeconds * 1000),
  };
}

export async function clearRateLimit(key: string): Promise<void> {
  await getDb().execute(sql`delete from rate_limits where key = ${key}`);
}

/** Rate-limit keys never contain raw IPs or emails. */
export function limitKey(scope: string, value: string): string {
  return `${scope}:${createHash("sha256").update(value.toLowerCase()).digest("hex").slice(0, 32)}`;
}
