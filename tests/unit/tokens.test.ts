import { describe, expect, it } from "vitest";
import { ACCESS_COOKIE, needsRefresh, REFRESH_COOKIE, secondsLeft, writeTokens, type SignedIn } from "@/lib/auth/tokens";

const jwt = (exp: number) => `x.${btoa(JSON.stringify({ sub: "u", exp })).replace(/=+$/, "")}.sig`;
const now = Date.UTC(2026, 9, 7, 12);

describe("token refresh", () => {
  it("reads a JWT's expiry without verifying it", () => {
    expect(secondsLeft(jwt(now / 1000 + 600), now)).toBe(600);
    expect(secondsLeft("not-a-jwt", now)).toBeNaN();
    expect(secondsLeft(undefined, now)).toBeNaN();
  });

  it("refreshes when the access token is missing, broken or has under a minute left", () => {
    expect(needsRefresh(jwt(now / 1000 + 600), now)).toBe(false);
    expect(needsRefresh(jwt(now / 1000 + 30), now)).toBe(true);
    expect(needsRefresh(jwt(now / 1000 - 5), now)).toBe(true);
    expect(needsRefresh(undefined, now)).toBe(true);
    expect(needsRefresh("garbage", now)).toBe(true);
  });

  it("stores both tokens as httpOnly cookies that expire with them", () => {
    const set: [string, string, Record<string, unknown>][] = [];
    const pair: SignedIn = {
      accessToken: "a",
      accessTokenExpiresAt: "2026-10-07T12:15:00.000Z",
      refreshToken: "r",
      refreshTokenExpiresAt: "2026-11-06T12:00:00.000Z",
      user: { id: "u", theme: "dark", mustChangePassword: false },
    };
    writeTokens({ set: (name, value, options) => set.push([name, value, options]) }, pair);
    expect(set.map(([name, value]) => [name, value])).toEqual([
      [ACCESS_COOKIE, "a"],
      [REFRESH_COOKIE, "r"],
    ]);
    expect(set[0][2]).toMatchObject({ httpOnly: true, sameSite: "lax", path: "/", expires: new Date(pair.accessTokenExpiresAt) });
  });
});
