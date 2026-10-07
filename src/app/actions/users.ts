"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { ApiError, apiFetch, formErrors } from "@/lib/api/client";
import { newPasswordSchema } from "@/lib/auth/password-rules";
import { requireSuperAdmin } from "@/lib/auth/require-user";
import { startSession } from "@/lib/auth/session";
import type { SignedIn } from "@/lib/auth/tokens";
import type { FormState } from "@/lib/form-state";

export interface InviteResult {
  ok: boolean;
  message: string;
  link?: string;
  errors?: Record<string, string>;
}

/** The API answer as `{ ok: false, message, errors }` (what the admin's forms expect). */
function failure(error: unknown): { ok: false; message: string; errors?: Record<string, string> } {
  if (!(error instanceof ApiError)) throw error;
  return { ok: false, message: error.message, ...(Object.keys(error.fields).length ? { errors: error.fields } : {}) };
}

/** Super admins only. Invites a staff member (super admin or editor). */
export async function inviteUser(input: { email: string; name: string; role: string }): Promise<InviteResult> {
  await requireSuperAdmin();
  try {
    const created = await apiFetch<{ message: string; link: string }>("/invites", { method: "POST", body: input });
    revalidatePath("/users");
    return { ok: true, message: created.message, link: created.link };
  } catch (error) {
    return failure(error);
  }
}

export async function revokeInvite(email: string): Promise<{ ok: boolean; message: string }> {
  await requireSuperAdmin();
  try {
    await apiFetch("/invites", { method: "DELETE", query: { email } });
  } catch (error) {
    return failure(error);
  }
  revalidatePath("/users");
  revalidatePath("/companies", "layout");
  return { ok: true, message: "Invite revoked." };
}

/** Super admins only, staff accounts only. The last super admin can never be demoted. */
export async function changeRole(userId: string, role: string): Promise<{ ok: boolean; message: string }> {
  await requireSuperAdmin();
  try {
    const { message } = await apiFetch<{ message: string }>(`/users/${encodeURIComponent(userId)}/role`, {
      method: "PATCH",
      body: { role },
    });
    revalidatePath("/users");
    return { ok: true, message };
  } catch (error) {
    return failure(error);
  }
}

/** Super admins only. Signs the user out everywhere. The last super admin can never be removed. */
export async function removeUser(userId: string): Promise<{ ok: boolean; message: string }> {
  await requireSuperAdmin();
  try {
    const { message, companyId } = await apiFetch<{ message: string; companyId: string | null }>(
      `/users/${encodeURIComponent(userId)}`,
      { method: "DELETE" },
    );
    revalidatePath("/users");
    if (companyId) revalidatePath(`/companies/${companyId}`);
    return { ok: true, message };
  } catch (error) {
    return failure(error);
  }
}

const acceptSchema = z
  .object({ name: z.string().trim().min(2, "Enter your name").max(80), password: newPasswordSchema, confirm: z.string() })
  .refine((v) => v.password === v.confirm, { message: "The passwords don't match", path: ["confirm"] });

/** Public (token-gated): the invited person picks a password and is signed in. */
export async function acceptInvite(_prev: FormState, formData: FormData): Promise<FormState> {
  const token = String(formData.get("token") ?? "");
  const values = { name: String(formData.get("name") ?? "") };
  const parsed = acceptSchema.safeParse({
    name: formData.get("name"),
    password: formData.get("password"),
    confirm: formData.get("confirm"),
  });
  if (!parsed.success) return { errors: z.flattenError(parsed.error).fieldErrors, values };

  let signedIn: SignedIn;
  try {
    signedIn = await apiFetch<SignedIn>(`/invites/${encodeURIComponent(token)}/accept`, {
      method: "POST",
      body: parsed.data,
      auth: false,
    });
  } catch (error) {
    if (!(error instanceof ApiError)) throw error;
    if (error.code === "invite_invalid") {
      return { message: "This invite link has expired or was already used. Ask an admin for a new one." };
    }
    if (error.code === "already_member") return { message: "An account with this email already exists. Sign in instead." };
    return Object.keys(error.fields).length ? { errors: formErrors(error), values } : { message: error.message };
  }
  await startSession(signedIn);
  redirect("/?welcome=1");
}
