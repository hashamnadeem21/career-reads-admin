"use server";

import { and, count, eq, gt, ne } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getDb } from "@/db";
import { companies, invites, users } from "@/db/schema";
import { logAudit } from "@/lib/audit";
import { hashPassword } from "@/lib/auth/password";
import { newPasswordSchema } from "@/lib/auth/password-rules";
import { createInvite, type InviteResult } from "@/lib/auth/invites";
import { requireSuperAdmin } from "@/lib/auth/require-user";
import { roleLabels } from "@/lib/auth/roles";
import { createSession, destroyAllSessions, hashToken } from "@/lib/auth/session";
import type { FormState } from "@/lib/form-state";
import { limitKey, rateLimit } from "@/lib/rate-limit";

/** Roles managed on the Users page. Company accounts are invited from Companies. */
const staffRoleSchema = z.enum(["super_admin", "editor"]);

const inviteSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email("Enter a valid email")),
  name: z.string().trim().min(2, "Enter their name").max(80),
});

/** Super admins only. Invites a staff member (super admin or editor). */
export async function inviteUser(input: { email: string; name: string; role: string }): Promise<InviteResult> {
  const admin = await requireSuperAdmin();
  const parsed = inviteSchema.extend({ role: staffRoleSchema }).safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: "Please fix the highlighted fields.", errors: Object.fromEntries(parsed.error.issues.map((i) => [String(i.path[0]), i.message])) };
  }
  const result = await createInvite(admin, { ...parsed.data, companyId: null });
  revalidatePath("/users");
  return result;
}

export async function revokeInvite(email: string): Promise<{ ok: boolean; message: string }> {
  const admin = await requireSuperAdmin();
  await getDb().delete(invites).where(eq(invites.email, z.email().parse(email)));
  await logAudit(admin, "revoked invite", "user", null, email);
  revalidatePath("/users");
  revalidatePath("/companies", "layout");
  return { ok: true, message: "Invite revoked." };
}

async function otherSuperAdminCount(excludeId: string): Promise<number> {
  const [{ n }] = await getDb().select({ n: count() }).from(users).where(and(eq(users.role, "super_admin"), ne(users.id, excludeId)));
  return n;
}

/** Super admins only, staff accounts only. The last super admin can never be demoted. */
export async function changeRole(userId: string, role: string): Promise<{ ok: boolean; message: string }> {
  const admin = await requireSuperAdmin();
  const id = z.uuid().parse(userId);
  const next = staffRoleSchema.parse(role);
  const db = getDb();
  const [target] = await db.select().from(users).where(eq(users.id, id)).limit(1);
  if (!target) return { ok: false, message: "User not found." };
  if (target.role === "company") return { ok: false, message: "Company accounts are managed from Companies." };
  if (target.role === next) return { ok: true, message: "No change." };
  if (target.role === "super_admin" && (await otherSuperAdminCount(target.id)) === 0) {
    return { ok: false, message: "There must always be at least one super admin." };
  }
  await db.update(users).set({ role: next }).where(eq(users.id, id));
  await logAudit(admin, "role changed", "user", null, `${target.name} → ${next}`);
  revalidatePath("/users");
  return { ok: true, message: `${target.name} is now ${next === "super_admin" ? "a super admin" : "an editor"}.` };
}

/** Super admins only. Signs the user out everywhere. The last super admin can never be removed. */
export async function removeUser(userId: string): Promise<{ ok: boolean; message: string }> {
  const admin = await requireSuperAdmin();
  const id = z.uuid().parse(userId);
  const db = getDb();
  const [target] = await db.select().from(users).where(eq(users.id, id)).limit(1);
  if (!target) return { ok: false, message: "Already removed." };
  if (target.id === admin.id) return { ok: false, message: "You can't remove yourself. Ask another super admin." };
  if (target.role === "super_admin" && (await otherSuperAdminCount(target.id)) === 0) {
    return { ok: false, message: "There must always be at least one super admin." };
  }
  await db.delete(users).where(eq(users.id, id)); // sessions and prefs cascade
  await logAudit(admin, "removed", "user", null, target.name);
  revalidatePath("/users");
  if (target.companyId) revalidatePath(`/companies/${target.companyId}`);
  return { ok: true, message: `${target.name} was removed.` };
}

/** Public (token-gated): the invited person picks a password and is signed in. */
export async function acceptInvite(_prev: FormState, formData: FormData): Promise<FormState> {
  const token = String(formData.get("token") ?? "");
  const parsed = z
    .object({ name: z.string().trim().min(2, "Enter your name").max(80), password: newPasswordSchema, confirm: z.string() })
    .refine((v) => v.password === v.confirm, { message: "The passwords don't match", path: ["confirm"] })
    .safeParse({ name: formData.get("name"), password: formData.get("password"), confirm: formData.get("confirm") });
  if (!parsed.success) return { errors: z.flattenError(parsed.error).fieldErrors, values: { name: String(formData.get("name") ?? "") } };

  const limit = await rateLimit(limitKey("invite", token.slice(0, 16)), 10, 900);
  if (!limit.allowed) return { message: "Too many attempts. Please wait a few minutes." };

  const db = getDb();
  const [invite] = await db
    .select()
    .from(invites)
    .where(and(eq(invites.tokenHash, hashToken(token)), gt(invites.expiresAt, new Date())))
    .limit(1);
  if (!invite) return { message: "This invite link has expired or was already used. Ask an admin for a new one." };
  if (invite.companyId) {
    const [company] = await db.select({ active: companies.active }).from(companies).where(eq(companies.id, invite.companyId)).limit(1);
    if (!company?.active) return { message: "This company account is paused. Contact Career Reads for help." };
  }

  const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, invite.email)).limit(1);
  if (existing) {
    await db.delete(invites).where(eq(invites.tokenHash, invite.tokenHash));
    return { message: "An account with this email already exists. Sign in instead." };
  }
  const [user] = await db.transaction(async (tx) => {
    await tx.delete(invites).where(eq(invites.tokenHash, invite.tokenHash)); // one-time
    return tx
      .insert(users)
      .values({ email: invite.email, name: parsed.data.name, role: invite.role, companyId: invite.companyId, passwordHash: await hashPassword(parsed.data.password), mustChangePassword: false })
      .returning();
  });
  await destroyAllSessions(user.id);
  await createSession(user.id);
  await logAudit(user, "joined", "user", null, `${user.name} (${roleLabels[user.role]})`);
  redirect("/?welcome=1");
}

