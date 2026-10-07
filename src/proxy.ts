import { NextResponse, type NextRequest } from "next/server";
import { ACCESS_COOKIE, LEGACY_SESSION_COOKIE, needsRefresh, REFRESH_COOKIE, type SignedIn, writeTokens } from "@/lib/auth/tokens";

/**
 * 1. Keeps the API session alive: when the access token is missing or about to expire, trades
 *    the refresh token for a new pair and passes it on to the page (or Server Action) and the
 *    browser. Server Components can't write cookies, so this is the only place that refreshes.
 * 2. Optimistic check: visitors without tokens are sent to /login. Real authorization happens
 *    in the API on every call, and in `requireUser()` on every page and action.
 */
const PUBLIC_PATHS = ["/login", "/invite"];

function apiUrl(): string {
  const configured = process.env.API_URL?.trim();
  if (configured) return configured.replace(/\/+$/, "");
  return process.env.NODE_ENV === "production" ? "https://api.careersreads.com" : "http://localhost:4000";
}

async function refresh(request: NextRequest, refreshToken: string): Promise<SignedIn | null> {
  const headers: Record<string, string> = { "content-type": "application/json", accept: "application/json" };
  if (process.env.ADMIN_API_KEY) headers["x-api-key"] = process.env.ADMIN_API_KEY;
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip");
  if (ip) headers["x-client-ip"] = ip;
  try {
    const res = await fetch(`${apiUrl()}/auth/refresh`, {
      method: "POST",
      headers,
      body: JSON.stringify({ refreshToken }),
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
    return res.ok ? ((await res.json()) as SignedIn) : null;
  } catch {
    return null; // API unreachable: keep the old cookies and let the page show the error.
  }
}

function toLogin(request: NextRequest): NextResponse {
  const { pathname, search } = request.nextUrl;
  const url = request.nextUrl.clone();
  url.pathname = "/login";
  url.search = pathname === "/" ? "" : `?next=${encodeURIComponent(pathname + search)}`;
  return NextResponse.redirect(url);
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isPublic = PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  const access = request.cookies.get(ACCESS_COOKIE)?.value;
  const refreshToken = request.cookies.get(REFRESH_COOKIE)?.value;

  if (refreshToken && needsRefresh(access)) {
    const pair = await refresh(request, refreshToken);
    if (pair) {
      // The page sees the new token in this same request...
      request.cookies.set(ACCESS_COOKIE, pair.accessToken);
      request.cookies.set(REFRESH_COOKIE, pair.refreshToken);
      const response = NextResponse.next({ request: { headers: request.headers } });
      // ...and the browser keeps it.
      writeTokens(response.cookies, pair);
      return response;
    }
    if (!access) {
      // The refresh token is no longer valid (signed out elsewhere, removed, paused): start over.
      const response = isPublic ? NextResponse.next() : toLogin(request);
      response.cookies.delete(ACCESS_COOKIE);
      response.cookies.delete(REFRESH_COOKIE);
      return response;
    }
  }

  if (isPublic || access) {
    const response = NextResponse.next();
    if (request.cookies.has(LEGACY_SESSION_COOKIE)) response.cookies.delete(LEGACY_SESSION_COOKIE);
    return response;
  }
  return toLogin(request);
}

export const config = {
  // Everything except Next internals and static files.
  matcher: ["/((?!_next/|uploads/|favicon.ico|icon.svg|robots.txt).*)"],
};
