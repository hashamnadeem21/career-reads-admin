import { NextResponse, type NextRequest } from "next/server";

/**
 * Optimistic check only: visitors without a session cookie are sent to /login.
 * Real authorization happens on the server in `requireUser()` on every page and action.
 */
const SESSION_COOKIE = "bn_admin_session";
const PUBLIC_PATHS = ["/login", "/invite"];

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const isPublic = PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  if (isPublic || request.cookies.has(SESSION_COOKIE)) return NextResponse.next();

  const url = request.nextUrl.clone();
  url.pathname = "/login";
  url.search = pathname === "/" ? "" : `?next=${encodeURIComponent(pathname + search)}`;
  return NextResponse.redirect(url);
}

export const config = {
  // Everything except Next internals, static files and API routes (which check auth themselves).
  matcher: ["/((?!_next/|api/|uploads/|favicon.ico|icon.svg|robots.txt).*)"],
};
