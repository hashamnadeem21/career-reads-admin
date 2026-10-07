/**
 * The API's token pair lives in two httpOnly cookies on the admin's domain; the browser never
 * sees the tokens' contents. No server-only import here: `proxy.ts` uses it too.
 */
export const ACCESS_COOKIE = "cr_admin_access";
export const REFRESH_COOKIE = "cr_admin_refresh";
/** The session cookie from before the API (deleted on sight). */
export const LEGACY_SESSION_COOKIE = "bn_admin_session";

/** What /auth/login, /auth/refresh, /auth/change-password and invite accept return. */
export interface SignedIn {
  accessToken: string;
  accessTokenExpiresAt: string;
  refreshToken: string;
  refreshTokenExpiresAt: string;
  user: { id: string; theme: "light" | "dark" | "system"; mustChangePassword: boolean };
}

interface CookieWriter {
  set(name: string, value: string, options: Record<string, unknown>): unknown;
}

const base = { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax" as const, path: "/" };

/** Stores a fresh pair (Server Actions via `cookies()`, or the proxy's response cookies). */
export function writeTokens(jar: CookieWriter, signedIn: SignedIn): void {
  jar.set(ACCESS_COOKIE, signedIn.accessToken, { ...base, expires: new Date(signedIn.accessTokenExpiresAt) });
  jar.set(REFRESH_COOKIE, signedIn.refreshToken, { ...base, expires: new Date(signedIn.refreshTokenExpiresAt) });
}

/** Seconds until a JWT's `exp` (not verified: the API does that). Negative or NaN when unusable. */
export function secondsLeft(token: string | undefined, now = Date.now()): number {
  if (!token) return Number.NaN;
  try {
    const payload = JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/"))) as { exp?: number };
    return typeof payload.exp === "number" ? payload.exp - now / 1000 : Number.NaN;
  } catch {
    return Number.NaN;
  }
}

/** Refresh when the access token is gone or has under a minute left. */
export function needsRefresh(accessToken: string | undefined, now = Date.now()): boolean {
  const left = secondsLeft(accessToken, now);
  return !(left > 60);
}
