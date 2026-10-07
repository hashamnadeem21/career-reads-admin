import type { Metadata } from "next";
import { PageHeader } from "@/components/admin/Glass";
import { UsersManager } from "@/components/users/UsersManager";
import { apiFetch } from "@/lib/api/client";
import { requireSuperAdmin } from "@/lib/auth/require-user";

export const metadata: Metadata = { title: "Users" };

/** Super admins only (everyone else gets a 403). Staff accounts only: company people live under Companies. */
export default async function UsersPage() {
  await requireSuperAdmin();
  type Staff = "super_admin" | "editor";
  const { members, invites: pending } = await apiFetch<{
    members: { id: string; name: string; email: string; role: Staff; createdAt: string; isYou: boolean }[];
    invites: { email: string; name: string; role: Staff; expiresAt: string }[];
  }>("/users");
  return (
    <>
      <PageHeader title="Users" description="Your Career Reads team. Super admins can do everything. Editors write posts and manage jobs, but can't change companies, settings or users. Company accounts are managed under Companies." />
      <UsersManager
        members={members}
        invites={pending}
      />
    </>
  );
}
