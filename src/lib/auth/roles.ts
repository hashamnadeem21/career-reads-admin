import type { Role } from "@/lib/api/types";

/**
 * Role rules shared by server and client code (no server-only imports here).
 *
 * - super_admin: everything (users, companies, settings).
 * - editor: editorial staff; posts, all jobs, categories, authors, media, messages.
 * - company: an employer; only its own company's jobs and their stats.
 */
export const STAFF_ROLES = ["super_admin", "editor"] as const satisfies readonly Role[];

export const roleLabels: Record<Role, string> = {
  super_admin: "Super admin",
  editor: "Editor",
  company: "Company",
};

export function isStaff(role: Role): boolean {
  return role === "super_admin" || role === "editor";
}

export function isSuperAdmin(role: Role): boolean {
  return role === "super_admin";
}

export function isCompany(role: Role): boolean {
  return role === "company";
}
