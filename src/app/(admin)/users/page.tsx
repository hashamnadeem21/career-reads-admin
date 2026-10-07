import { and, asc, gt, isNull, ne } from "drizzle-orm";
import type { Metadata } from "next";
import { PageHeader } from "@/components/admin/Glass";
import { UsersManager } from "@/components/users/UsersManager";
import { getDb } from "@/db";
import { invites, users } from "@/db/schema";
import { requireSuperAdmin } from "@/lib/auth/require-user";

export const metadata: Metadata = { title: "Users" };

/** Super admins only (everyone else gets a 403). Staff accounts only: company people live under Companies. */
export default async function UsersPage() {
  const me = await requireSuperAdmin();
  const db = getDb();
  const [members, pending] = await Promise.all([
    db.select({ id: users.id, name: users.name, email: users.email, role: users.role, createdAt: users.createdAt }).from(users).where(ne(users.role, "company")).orderBy(asc(users.createdAt)),
    db.select().from(invites).where(and(gt(invites.expiresAt, new Date()), isNull(invites.companyId))).orderBy(asc(invites.createdAt)),
  ]);
  return (
    <>
      <PageHeader title="Users" description="Your Career Reads team. Super admins can do everything. Editors write posts and manage jobs, but can't change companies, settings or users. Company accounts are managed under Companies." />
      <UsersManager
        members={members.map((m) => ({ ...m, role: m.role as "super_admin" | "editor", createdAt: m.createdAt.toISOString(), isYou: m.id === me.id }))}
        invites={pending.map((i) => ({ email: i.email, name: i.name, role: i.role as "super_admin" | "editor", expiresAt: i.expiresAt.toISOString() }))}
      />
    </>
  );
}
