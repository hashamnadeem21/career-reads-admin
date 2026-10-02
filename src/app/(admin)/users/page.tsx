import { asc, gt } from "drizzle-orm";
import type { Metadata } from "next";
import { PageHeader } from "@/components/admin/Glass";
import { UsersManager } from "@/components/users/UsersManager";
import { getDb } from "@/db";
import { invites, users } from "@/db/schema";
import { requireUser } from "@/lib/auth/require-user";

export const metadata: Metadata = { title: "Users" };

/** Admins only (editors get a 403). */
export default async function UsersPage() {
  const me = await requireUser("admin");
  const db = getDb();
  const [members, pending] = await Promise.all([
    db.select({ id: users.id, name: users.name, email: users.email, role: users.role, createdAt: users.createdAt }).from(users).orderBy(asc(users.createdAt)),
    db.select().from(invites).where(gt(invites.expiresAt, new Date())).orderBy(asc(invites.createdAt)),
  ]);
  return (
    <>
      <PageHeader title="Users" description="Admins can do everything. Editors write and publish posts and jobs, but can't change settings or users." />
      <UsersManager
        members={members.map((m) => ({ ...m, createdAt: m.createdAt.toISOString(), isYou: m.id === me.id }))}
        invites={pending.map((i) => ({ email: i.email, name: i.name, role: i.role, expiresAt: i.expiresAt.toISOString() }))}
      />
    </>
  );
}
