"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { ApiError, apiFetch, formErrors } from "@/lib/api/client";
import { requireSuperAdmin } from "@/lib/auth/require-user";
import type { FormState } from "@/lib/form-state";
import type { InviteCreated } from "./users";

/** Company account requests from the website. Super admins only. */

const idSchema = z.uuid();

const approveSchema = z.object({
  companyName: z.string().trim().min(2, "Enter the company name").max(100, "Keep it under 100 characters"),
  website: z
    .string()
    .trim()
    .max(300)
    .transform((v) => v || undefined)
    .pipe(z.url("Enter a full address, like https://company.com").optional()),
  autoPublish: z.boolean(),
  onsiteApplyEnabled: z.boolean(),
  contactName: z.string().trim().min(2, "Enter their name").max(80),
  contactEmail: z.string().trim().toLowerCase().pipe(z.email("Enter a valid email")),
});

const rejectSchema = z.object({
  reason: z
    .string()
    .trim()
    .max(1000, "Keep it under 1,000 characters")
    .transform((v) => v || undefined),
  notify: z.boolean(),
});

export type ApproveState = FormState & { companyId?: string; invite?: InviteCreated };

function failure(error: unknown, values: Record<string, string>): FormState {
  if (!(error instanceof ApiError)) throw error;
  return Object.keys(error.fields).length ? { message: error.message, errors: formErrors(error), values } : { message: error.message, values };
}

function refresh(id: string) {
  revalidatePath("/company-requests");
  revalidatePath(`/company-requests/${id}`);
  revalidatePath("/", "layout"); // the sidebar's badge
}

/** Creates the company and emails the contact an invite to its first admin account. */
export async function approveCompanyRequest(_prev: ApproveState, formData: FormData): Promise<ApproveState> {
  await requireSuperAdmin();
  const id = idSchema.parse(formData.get("id"));
  const values = Object.fromEntries(["companyName", "website", "contactName", "contactEmail"].map((k) => [k, String(formData.get(k) ?? "")]));
  const parsed = approveSchema.safeParse({
    ...values,
    autoPublish: formData.get("autoPublish") === "on",
    onsiteApplyEnabled: formData.get("onsiteApplyEnabled") === "on",
  });
  if (!parsed.success) return { errors: z.flattenError(parsed.error).fieldErrors, values };
  try {
    const result = await apiFetch<{ message: string; companyId: string; invite: InviteCreated }>(`/company-requests/${id}/approve`, {
      method: "POST",
      body: parsed.data,
    });
    refresh(id);
    revalidatePath("/companies");
    return { ok: true, message: result.message, companyId: result.companyId, invite: result.invite };
  } catch (error) {
    return failure(error, values);
  }
}

/** Turns the request down; with "notify", emails them (and the reason, if given). */
export async function rejectCompanyRequest(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireSuperAdmin();
  const id = idSchema.parse(formData.get("id"));
  const values = { reason: String(formData.get("reason") ?? "") };
  const parsed = rejectSchema.safeParse({ reason: values.reason, notify: formData.get("notify") === "on" });
  if (!parsed.success) return { errors: z.flattenError(parsed.error).fieldErrors, values };
  try {
    const result = await apiFetch<{ message: string }>(`/company-requests/${id}/reject`, { method: "POST", body: parsed.data });
    refresh(id);
    return { ok: true, message: result.message };
  } catch (error) {
    return failure(error, values);
  }
}
