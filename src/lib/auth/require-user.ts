import "server-only";
import { forbidden, redirect } from "next/navigation";
import type { Role } from "@/db/schema";
import { STAFF_ROLES } from "./roles";
import { getCurrentUser, type SessionUser } from "./session";

/**
 * The ONE server-side gate. Every page, Server Action and route handler calls
 * one of these. `proxy.ts` only does an optimistic redirect and is never trusted.
 *
 * - not signed in → redirect to /login
 * - signed in with a role that isn't allowed → 403
 */
export async function requireUser(...allowed: Role[]): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (allowed.length > 0 && !allowed.includes(user.role)) forbidden();
  return user;
}

/** Career Reads staff (super admins and editors). Company accounts get a 403. */
export function requireStaff(): Promise<SessionUser> {
  return requireUser(...STAFF_ROLES);
}

/** The owner only: users, companies, settings. */
export function requireSuperAdmin(): Promise<SessionUser> {
  return requireUser("super_admin");
}

export { isCompany, isStaff, isSuperAdmin } from "./roles";
