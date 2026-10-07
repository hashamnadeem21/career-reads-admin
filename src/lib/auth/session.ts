import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { and, eq, gt } from "drizzle-orm";
import { cookies } from "next/headers";
import { cache } from "react";
import { getDb } from "@/db";
import { companies, sessions, users, type Role } from "@/db/schema";
import { isProduction } from "@/lib/env";

export const SESSION_COOKIE = "bn_admin_session";
const SESSION_DAYS = 30;

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
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** Creates a server-side session and sets the cookie. Call from a Server Action. */
export async function createSession(userId: string): Promise<void> {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86_400_000);
  await getDb().insert(sessions).values({ id: hashToken(token), userId, expiresAt });
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

/** Deletes the current session (and cookie). */
export async function destroySession(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) await getDb().delete(sessions).where(eq(sessions.id, hashToken(token)));
  jar.delete(SESSION_COOKIE);
}

/** Signs a user out everywhere (password change, removal). */
export async function destroyAllSessions(userId: string): Promise<void> {
  await getDb().delete(sessions).where(eq(sessions.userId, userId));
}

/**
 * The signed-in user for this request, or null. Looked up in the database every request,
 * so role changes, removals and paused companies take effect immediately.
 */
export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const [row] = await getDb()
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      mustChangePassword: users.mustChangePassword,
      companyId: users.companyId,
      companyName: companies.name,
      companyAutoPublish: companies.autoPublish,
      companyActive: companies.active,
    })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .leftJoin(companies, eq(companies.id, users.companyId))
    .where(and(eq(sessions.id, hashToken(token)), gt(sessions.expiresAt, new Date())))
    .limit(1);
  if (!row) return null;
  const { companyActive, ...user } = row;
  // A company account whose company is missing or paused is treated as signed out.
  if (user.role === "company" && (!user.companyId || !companyActive)) return null;
  return { ...user, companyAutoPublish: user.companyAutoPublish ?? false };
});
