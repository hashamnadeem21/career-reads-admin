import "server-only";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { ACCESS_COOKIE } from "@/lib/auth/tokens";
import { env } from "@/lib/env";
import type { paths } from "./schema";

/**
 * Server-only client for the Career Reads API (blognest-api). Every call carries the admin's
 * server key and the visitor's IP (the API rate-limits sign-ins per visitor), plus the signed-in
 * user's access token from the httpOnly cookie. Tokens are refreshed by `proxy.ts` before pages
 * and Server Actions run, because Server Components can't write cookies.
 */
type ApiPath = keyof paths;

/** Fills `{slug}`-style segments: `apiPath("/posts/{slug}", { slug })`. */
export function apiPath<P extends ApiPath>(path: P, params: Record<string, string | number> = {}): string {
  return path.replace(/\{(\w+)\}/g, (_, name: string) => encodeURIComponent(String(params[name] ?? "")));
}

/** An error answer from the API: `{ error: { code, message, fields?, details? } }`. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly fields: Record<string, string> = {},
    readonly details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export interface ApiOptions {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  query?: Record<string, string | number | undefined | null>;
  /** JSON body (or FormData for uploads). */
  body?: unknown;
  /** Send the signed-in user's token (default). False for sign-in, refresh and invite pages. */
  auth?: boolean;
  /** Revive ISO date strings into Dates (row-shaped answers, typed with Date fields). */
  dates?: boolean;
  /** What to do on 401: send the user to /login (default), or throw so the caller decides. */
  onUnauthorized?: "redirect" | "throw";
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/;
const reviveDates = (_key: string, value: unknown) =>
  typeof value === "string" && ISO_DATE.test(value) ? new Date(value) : value;

/** The visitor's address, as Vercel / the local server saw it. */
export async function visitorIp(): Promise<string | null> {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || null;
}

/** Headers every call to the API carries. */
export function serverHeaders(ip: string | null): Record<string, string> {
  const { ADMIN_API_KEY } = env();
  const result: Record<string, string> = { accept: "application/json" };
  if (ADMIN_API_KEY) result["x-api-key"] = ADMIN_API_KEY;
  if (ip) result["x-client-ip"] = ip;
  return result;
}

/** Sends a request and returns the raw response. Throws ApiError on any error answer. */
export async function apiResponse(path: string, options: ApiOptions = {}): Promise<Response> {
  const { method = "GET", query, body, auth = true, onUnauthorized = "redirect" } = options;
  const url = new URL(path, `${env().API_URL}/`);
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined && value !== null && value !== "") url.searchParams.set(key, String(value));
  }
  const requestHeaders = serverHeaders(await visitorIp());
  if (auth) {
    const token = (await cookies()).get(ACCESS_COOKIE)?.value;
    if (token) requestHeaders.authorization = `Bearer ${token}`;
  }
  const isForm = body instanceof FormData;
  if (body !== undefined && !isForm) requestHeaders["content-type"] = "application/json";

  const response = await fetch(url, {
    method,
    headers: requestHeaders,
    body: body === undefined ? undefined : isForm ? body : JSON.stringify(body),
    cache: "no-store",
    signal: AbortSignal.timeout(30_000),
  });
  if (response.ok) return response;
  const text = await response.text();
  let parsed: { error?: { code?: string; message?: string; fields?: Record<string, string>; details?: unknown } } | null =
    null;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    // Not JSON (e.g. a proxy error page): fall back to the status below.
  }
  if (response.status === 401 && auth && onUnauthorized === "redirect") redirect("/login");
  throw new ApiError(
    response.status,
    parsed?.error?.code ?? "error",
    parsed?.error?.message ?? `The API answered ${response.status}.`,
    parsed?.error?.fields,
    parsed?.error?.details,
  );
}

/** Calls the API and returns the parsed JSON (undefined for 204). Throws ApiError on any error answer. */
export async function apiFetch<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const response = await apiResponse(path, options);
  if (response.status === 204) return undefined as T;
  const text = await response.text();
  return (text ? JSON.parse(text, options.dates ? reviveDates : undefined) : undefined) as T;
}

/** GET that returns null for a 404 (pages show their own not-found). */
export async function apiGetOrNull<T>(path: string, options: Omit<ApiOptions, "method" | "body"> = {}): Promise<T | null> {
  try {
    return await apiFetch<T>(path, options);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null;
    throw error;
  }
}

/** API `fields` → the admin's FormState errors (`{ field: [message] }`). */
export function formErrors(error: ApiError): Record<string, string[]> {
  return Object.fromEntries(Object.entries(error.fields).map(([k, v]) => [k, [v]]));
}
