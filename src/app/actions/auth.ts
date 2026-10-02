"use server";

import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getDb } from "@/db";
import { users, userPrefs } from "@/db/schema";
import { getDummyHash, hashPassword, verifyPassword } from "@/lib/auth/password";
import { requireUser } from "@/lib/auth/require-user";
import { createSession, destroyAllSessions, destroySession } from "@/lib/auth/session";
import type { FormState } from "@/lib/form-state";
import { clearRateLimit, limitKey, rateLimit } from "@/lib/rate-limit";
import { setThemeCookie } from "@/lib/theme";

const loginSchema = z.object({
  email: z.email("Enter a valid email").trim().toLowerCase(),
  password: z.string().min(1, "Enter your password").max(200),
});

const GENERIC_ERROR = "That email and password don't match.";

async function clientIp(): Promise<string> {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
}

/** Safe in-app redirect target only (no protocol-relative or absolute URLs). */
function safeNext(value: FormDataEntryValue | null): string {
  const next = typeof value === "string" ? value : "";
  return /^\/(?!\/|\\)/.test(next) && !next.startsWith("/login") ? next : "/";
}

export async function login(_prev: FormState, formData: FormData): Promise<FormState> {
  const values = { email: String(formData.get("email") ?? "") };
  const parsed = loginSchema.safeParse({ email: formData.get("email"), password: formData.get("password") });
  if (!parsed.success) return { errors: z.flattenError(parsed.error).fieldErrors, values };

  const { email, password } = parsed.data;
  // 10 attempts per 15 minutes per IP, and per account.
  const [byIp, byEmail] = await Promise.all([
    rateLimit(limitKey("login-ip", await clientIp()), 10, 900),
    rateLimit(limitKey("login-email", email), 10, 900),
  ]);
  if (!byIp.allowed || !byEmail.allowed) {
    return { message: "Too many sign-in attempts. Please wait 15 minutes and try again.", values };
  }

  const [user] = await getDb().select().from(users).where(eq(users.email, email)).limit(1);
  const valid = await verifyPassword(user?.passwordHash ?? (await getDummyHash()), password);
  if (!user || !valid) return { message: GENERIC_ERROR, values };

  await clearRateLimit(limitKey("login-email", email));
  await createSession(user.id);
  const [prefs] = await getDb().select().from(userPrefs).where(eq(userPrefs.userId, user.id)).limit(1);
  if (prefs) await setThemeCookie(prefs.theme);

  redirect(user.mustChangePassword ? "/account/password" : safeNext(formData.get("next")));
}

export async function logout(): Promise<void> {
  await destroySession();
  redirect("/login");
}

const passwordSchema = z
  .object({
    current: z.string().min(1, "Enter your current password"),
    next: z
      .string()
      .min(12, "Use at least 12 characters")
      .max(200)
      .refine((v) => /[a-zA-Z]/.test(v) && /[0-9\W_]/.test(v), "Mix letters with numbers or symbols"),
    confirm: z.string(),
  })
  .refine((v) => v.next === v.confirm, { message: "The passwords don't match", path: ["confirm"] })
  .refine((v) => v.next !== v.current, { message: "Choose a password you haven't used here", path: ["next"] });

export async function changePassword(_prev: FormState, formData: FormData): Promise<FormState> {
  const sessionUser = await requireUser();
  const parsed = passwordSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { errors: z.flattenError(parsed.error).fieldErrors };

  const limit = await rateLimit(limitKey("password", sessionUser.id), 10, 900);
  if (!limit.allowed) return { message: "Too many attempts. Please wait a few minutes." };

  const [user] = await getDb().select().from(users).where(eq(users.id, sessionUser.id)).limit(1);
  if (!user || !(await verifyPassword(user.passwordHash, parsed.data.current))) {
    return { errors: { current: ["That isn't your current password"] } };
  }

  await getDb()
    .update(users)
    .set({ passwordHash: await hashPassword(parsed.data.next), mustChangePassword: false })
    .where(eq(users.id, user.id));
  // Sign out other devices, then start a fresh session here.
  await destroyAllSessions(user.id);
  await createSession(user.id);
  redirect("/?password=changed");
}

