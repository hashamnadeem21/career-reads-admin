"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { ApiError, apiFetch, formErrors } from "@/lib/api/client";
import { newPasswordSchema } from "@/lib/auth/password-rules";
import { requireUser } from "@/lib/auth/require-user";
import { endSession, startSession } from "@/lib/auth/session";
import type { SignedIn } from "@/lib/auth/tokens";
import type { FormState } from "@/lib/form-state";
import { setThemeCookie } from "@/lib/theme";

const loginSchema = z.object({
  email: z.email("Enter a valid email").trim().toLowerCase(),
  password: z.string().min(1, "Enter your password").max(200),
});

/** Safe in-app redirect target only (no protocol-relative or absolute URLs). */
function safeNext(value: FormDataEntryValue | null): string {
  const next = typeof value === "string" ? value : "";
  return /^\/(?!\/|\\)/.test(next) && !next.startsWith("/login") ? next : "/";
}

/** The API checks the password, rate-limits per visitor and per account, and refuses paused companies. */
export async function login(_prev: FormState, formData: FormData): Promise<FormState> {
  const values = { email: String(formData.get("email") ?? "") };
  const parsed = loginSchema.safeParse({ email: formData.get("email"), password: formData.get("password") });
  if (!parsed.success) return { errors: z.flattenError(parsed.error).fieldErrors, values };

  let signedIn: SignedIn;
  try {
    signedIn = await apiFetch<SignedIn>("/auth/login", { method: "POST", body: parsed.data, auth: false });
  } catch (error) {
    if (error instanceof ApiError) return { message: error.message, values };
    throw error;
  }
  await startSession(signedIn);
  await setThemeCookie(signedIn.user.theme);
  redirect(signedIn.user.mustChangePassword ? "/account/password" : safeNext(formData.get("next")));
}

export async function logout(): Promise<void> {
  await endSession();
  redirect("/login");
}

const passwordSchema = z
  .object({
    current: z.string().min(1, "Enter your current password"),
    next: newPasswordSchema,
    confirm: z.string(),
  })
  .refine((v) => v.next === v.confirm, { message: "The passwords don't match", path: ["confirm"] })
  .refine((v) => v.next !== v.current, { message: "Choose a password you haven't used here", path: ["next"] });

/** Signs out every other device; this one gets a fresh session. */
export async function changePassword(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireUser();
  const parsed = passwordSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { errors: z.flattenError(parsed.error).fieldErrors };

  let signedIn: SignedIn;
  try {
    signedIn = await apiFetch<SignedIn>("/auth/change-password", { method: "POST", body: parsed.data });
  } catch (error) {
    if (error instanceof ApiError) {
      return Object.keys(error.fields).length ? { errors: formErrors(error) } : { message: error.message };
    }
    throw error;
  }
  await startSession(signedIn);
  redirect("/?password=changed");
}
