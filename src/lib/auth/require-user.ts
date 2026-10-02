import "server-only";
import { forbidden, redirect } from "next/navigation";
import type { Role } from "@/db/schema";
import { getCurrentUser, type SessionUser } from "./session";

/**
 * The ONE server-side gate. Every admin page, Server Action and route handler
 * calls it. `proxy.ts` only does an optimistic redirect and is never trusted.
 *
 * - not signed in → redirect to /login
 * - `role: "admin"` and the user is an editor → 403
 */
export async function requireUser(role?: Role): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (role === "admin" && user.role !== "admin") forbidden();
  return user;
}

export function isAdmin(user: Pick<SessionUser, "role">): boolean {
  return user.role === "admin";
}
