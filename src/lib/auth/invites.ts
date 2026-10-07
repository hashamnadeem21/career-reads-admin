import "server-only";
import { randomBytes } from "node:crypto";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { getDb } from "@/db";
import { invites, users, type Role } from "@/db/schema";
import { logAudit } from "@/lib/audit";
import { roleLabels } from "./roles";
import { hashToken } from "./session";

/**
 * Not a Server Action on purpose: it has no permission check of its own.
 * Callers (Users and Companies actions) must check permissions first.
 */
const INVITE_DAYS = 7;

export interface InviteResult {
  ok: boolean;
  message: string;
  link?: string;
  errors?: Record<string, string>;
}

async function inviteOrigin(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

/** Creates a one-time invite link (valid 7 days) and returns it to share. */
export async function createInvite(
  invitedBy: { id: string; name: string; email: string; role: Role },
  input: { email: string; name: string; role: Role; companyId: string | null },
): Promise<InviteResult> {
  const { email, name, role, companyId } = input;
  const db = getDb();
  const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
  if (existing) return { ok: false, message: "That person already has an account.", errors: { email: "Already has an account" } };

  const token = randomBytes(32).toString("base64url");
  await db.delete(invites).where(eq(invites.email, email)); // a new invite replaces older ones
  await db.insert(invites).values({
    tokenHash: hashToken(token),
    email,
    name,
    role,
    companyId,
    invitedBy: invitedBy.id,
    expiresAt: new Date(Date.now() + INVITE_DAYS * 86_400_000),
  });
  await logAudit(invitedBy, "invited", "user", null, `${name} (${roleLabels[role]})`);
  return { ok: true, message: `Invite created for ${name}. Send them the link below.`, link: `${await inviteOrigin()}/invite/${token}` };
}
