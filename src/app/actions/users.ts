"use server";

import { randomBytes } from "node:crypto";
import { and, count, eq, gt, ne } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getDb } from "@/db";
import { invites, users } from "@/db/schema";
import { logAudit } from "@/lib/audit";
import { hashPassword } from "@/lib/auth/password";
import { newPasswordSchema } from "@/lib/auth/password-rules";
import { requireUser } from "@/lib/auth/require-user";
import { createSession, destroyAllSessions, hashToken } from "@/lib/auth/session";
import type { FormState } from "@/lib/form-state";
import { limitKey, rateLimit } from "@/lib/rate-limit";

const INVITE_DAYS = 7;
const roleSchema = z.enum(["admin", "editor"]);

export interface InviteResult {
  ok: boolean;
  message: string;
  link?: string;
  errors?: Record<string, string>;
}

/** Admins only. Creates a one-time invite link (valid 7 days) to share with the new team member. */
export async function inviteUser(input: { email: string; name: string; role: string }): Promise<InviteResult> {
  const admin = await requireUser("admin");
  const parsed = z
    .object({ email: z.email("Enter a valid email").trim().toLowerCase(), name: z.string().trim().min(2, "Enter their name").max(80), role: roleSchema })
    .safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: "Please fix the highlighted fields.", errors: Object.fromEntries(parsed.error.issues.map((i) => [String(i.path[0]), i.message])) };
  }
  const { email, name, role } = parsed.data;
  const db = getDb();
  const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
  if (existing) return { ok: false, message: "That person already has an account.", errors: { email: "Already a team member" } };

  const token = randomBytes(32).toString("base64url");
  await db.delete(invites).where(eq(invites.email, email)); // a new invite replaces older ones
  await db.insert(invites).values({
    tokenHash: hashToken(token),
    email,
    name,
    role,
    invitedBy: admin.id,
    expiresAt: new Date(Date.now() + INVITE_DAYS * 86_400_000),
  });
  await logAudit(admin, "invited", "user", null, `${name} (${role})`);
  revalidatePath("/users");
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const origin = `${proto}://${host}`;
  return { ok: true, message: `Invite created for ${name}. Send them the link below.`, link: `${origin}/invite/${token}` };
}

export async function revokeInvite(email: string): Promise<{ ok: boolean; message: string }> {
  const admin = await requireUser("admin");
  await getDb().delete(invites).where(eq(invites.email, z.email().parse(email)));
  await logAudit(admin, "revoked invite", "user", null, email);
  revalidatePath("/users");
  return { ok: true, message: "Invite revoked." };
}

async function otherAdminCount(excludeId: string): Promise<number> {
  const [{ n }] = await getDb().select({ n: count() }).from(users).where(and(eq(users.role, "admin"), ne(users.id, excludeId)));
  return n;
}

/** Admins only. The last admin can never be demoted. */
export async function changeRole(userId: string, role: string): Promise<{ ok: boolean; message: string }> {
  const admin = await requireUser("admin");
  const id = z.uuid().parse(userId);
  const next = roleSchema.parse(role);
  const db = getDb();
  const [target] = await db.select().from(users).where(eq(users.id, id)).limit(1);
  if (!target) return { ok: false, message: "User not found." };
  if (target.role === next) return { ok: true, message: "No change." };
  if (target.role === "admin" && next === "editor" && (await otherAdminCount(target.id)) === 0) {
    return { ok: false, message: "There must always be at least one admin." };
  }
  await db.update(users).set({ role: next }).where(eq(users.id, id));
  await logAudit(admin, "role changed", "user", null, `${target.name} → ${next}`);
  revalidatePath("/users");
  return { ok: true, message: `${target.name} is now ${next === "admin" ? "an admin" : "an editor"}.` };
}

/** Admins only. Signs the user out everywhere. The last admin can never be removed. */
export async function removeUser(userId: string): Promise<{ ok: boolean; message: string }> {
  const admin = await requireUser("admin");
  const id = z.uuid().parse(userId);
  const db = getDb();
  const [target] = await db.select().from(users).where(eq(users.id, id)).limit(1);
  if (!target) return { ok: false, message: "Already removed." };
  if (target.id === admin.id) return { ok: false, message: "You can't remove yourself. Ask another admin." };
  if (target.role === "admin" && (await otherAdminCount(target.id)) === 0) return { ok: false, message: "There must always be at least one admin." };
  await db.delete(users).where(eq(users.id, id)); // sessions and prefs cascade
  await logAudit(admin, "removed", "user", null, target.name);
  revalidatePath("/users");
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

  const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, invite.email)).limit(1);
  if (existing) {
    await db.delete(invites).where(eq(invites.tokenHash, invite.tokenHash));
    return { message: "An account with this email already exists. Sign in instead." };
  }
  const [user] = await db.transaction(async (tx) => {
    await tx.delete(invites).where(eq(invites.tokenHash, invite.tokenHash)); // one-time
    return tx
      .insert(users)
      .values({ email: invite.email, name: parsed.data.name, role: invite.role, passwordHash: await hashPassword(parsed.data.password), mustChangePassword: false })
      .returning();
  });
  await destroyAllSessions(user.id);
  await createSession(user.id);
  await logAudit(user, "joined", "user", null, `${user.name} (${user.role})`);
  redirect("/?welcome=1");
}

