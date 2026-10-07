import "server-only";
import { cookies } from "next/headers";
import { cache } from "react";
import { ApiError, apiFetch } from "@/lib/api/client";
import type { Role, Theme } from "@/lib/api/types";
import { ACCESS_COOKIE, REFRESH_COOKIE, type SignedIn, writeTokens } from "./tokens";

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  mustChangePassword: boolean;
  /** Company accounts only (null for staff). */
  companyId: string | null;
  companyName: string | null;
  /** Whether the company may publish without review. */
  companyAutoPublish: boolean;
  theme: Theme;
}

/**
 * The signed-in user for this request, or null. Asked from the API (`GET /auth/me`) every
 * request, so role changes, removals and paused companies take effect immediately.
 */
export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  if (!(await cookies()).get(ACCESS_COOKIE)?.value) return null;
  try {
    const { user } = await apiFetch<{ user: SessionUser }>("/auth/me", { onUnauthorized: "throw" });
    return user;
  } catch (error) {
    if (error instanceof ApiError && (error.status === 401 || error.status === 403)) return null;
    throw error;
  }
});

/** Stores a new token pair. Call from a Server Action. */
export async function startSession(signedIn: SignedIn): Promise<void> {
  writeTokens(await cookies(), signedIn);
}

/** Ends this device's session at the API and deletes the cookies. Call from a Server Action. */
export async function endSession(): Promise<void> {
  const jar = await cookies();
  const refreshToken = jar.get(REFRESH_COOKIE)?.value;
  if (refreshToken) {
    await apiFetch("/auth/logout", { method: "POST", body: { refreshToken }, auth: false }).catch(() => {});
  }
  jar.delete(ACCESS_COOKIE);
  jar.delete(REFRESH_COOKIE);
}
