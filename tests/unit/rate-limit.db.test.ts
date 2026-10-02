import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { closeDb } from "@/db";
import { clearRateLimit, limitKey, rateLimit } from "@/lib/rate-limit";
import { resetTestDb, useTestDb } from "../helpers/test-db";

beforeAll(async () => resetTestDb(await useTestDb()));
afterAll(closeDb);

describe("database rate limiter", () => {
  it("allows up to the limit inside the window, then blocks", async () => {
    const key = limitKey("test", "203.0.113.7");
    const results = [];
    for (let i = 0; i < 4; i++) results.push(await rateLimit(key, 3, 60));
    expect(results.map((r) => r.allowed)).toEqual([true, true, true, false]);
    expect(results[0].remaining).toBe(2);
  });

  it("starts a new window after it expires", async () => {
    const key = limitKey("test", "window");
    await rateLimit(key, 1, 1);
    expect((await rateLimit(key, 1, 1)).allowed).toBe(false);
    await new Promise((r) => setTimeout(r, 1100));
    expect((await rateLimit(key, 1, 1)).allowed).toBe(true);
  });

  it("never stores the raw value in the key", async () => {
    expect(limitKey("login-email", "Someone@Example.com")).not.toMatch(/example/i);
    const key = limitKey("test", "clear-me");
    await rateLimit(key, 1, 60);
    await clearRateLimit(key);
    expect((await rateLimit(key, 1, 60)).allowed).toBe(true);
  });
});
