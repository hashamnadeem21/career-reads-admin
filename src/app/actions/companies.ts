"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { ApiError, apiFetch, formErrors } from "@/lib/api/client";
import type { CompanyRow } from "@/lib/api/types";
import { requireSuperAdmin } from "@/lib/auth/require-user";
import type { FormState } from "@/lib/form-state";
import type { InviteResult } from "./users";

/** Companies are managed by super admins only. */

const companySchema = z.object({
  name: z.string().trim().min(2, "Enter the company name").max(100, "Keep it under 100 characters"),
  website: z
    .string()
    .trim()
    .max(300)
    .transform((v) => v || undefined)
    .pipe(z.url("Enter a full address, like https://company.com").optional()),
  autoPublish: z.boolean(),
});

const idSchema = z.uuid();

function readCompanyForm(formData: FormData) {
  return companySchema.safeParse({
    name: formData.get("name") ?? "",
    website: formData.get("website") ?? "",
    autoPublish: formData.get("autoPublish") === "on",
  });
}

function formFailure(error: unknown, values: Record<string, string>): FormState {
  if (!(error instanceof ApiError)) throw error;
  return Object.keys(error.fields).length ? { errors: formErrors(error), values } : { message: error.message, values };
}

export async function createCompany(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireSuperAdmin();
  const parsed = readCompanyForm(formData);
  const values = { name: String(formData.get("name") ?? ""), website: String(formData.get("website") ?? "") };
  if (!parsed.success) return { errors: z.flattenError(parsed.error).fieldErrors, values };

  let company: CompanyRow;
  try {
    company = await apiFetch<CompanyRow>("/companies", { method: "POST", body: parsed.data });
  } catch (error) {
    return formFailure(error, values);
  }
  revalidatePath("/companies");
  redirect(`/companies/${company.id}?notice=created`);
}

/** Rename, change website or trust level. Renaming updates the name shown on all its jobs. */
export async function updateCompany(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireSuperAdmin();
  const id = idSchema.parse(formData.get("id"));
  const parsed = readCompanyForm(formData);
  const values = { name: String(formData.get("name") ?? ""), website: String(formData.get("website") ?? "") };
  if (!parsed.success) return { errors: z.flattenError(parsed.error).fieldErrors, values };
  try {
    await apiFetch(`/companies/${id}`, { method: "PATCH", body: parsed.data });
  } catch (error) {
    return formFailure(error, values);
  }
  revalidatePath("/companies");
  revalidatePath(`/companies/${id}`);
  return { ok: true, message: "Saved." };
}

/** Pausing signs everyone at the company out and blocks sign-in. Their jobs stay as they are. */
export async function setCompanyActive(id: string, active: boolean): Promise<{ ok: boolean; message: string }> {
  await requireSuperAdmin();
  const companyId = idSchema.parse(id);
  try {
    const { message } = await apiFetch<{ message: string }>(`/companies/${companyId}/active`, {
      method: "POST",
      body: { active: z.boolean().parse(active) },
    });
    revalidatePath("/companies");
    revalidatePath(`/companies/${companyId}`);
    return { ok: true, message };
  } catch (error) {
    if (error instanceof ApiError) return { ok: false, message: error.message };
    throw error;
  }
}

/**
 * Deletes the company and its user accounts. Its jobs are kept (as Career Reads jobs,
 * with their stats) so nothing disappears from the site by accident.
 */
export async function deleteCompany(id: string): Promise<void> {
  await requireSuperAdmin();
  const companyId = idSchema.parse(id);
  try {
    await apiFetch(`/companies/${companyId}`, { method: "DELETE" });
  } catch (error) {
    if (!(error instanceof ApiError && error.status === 404)) throw error;
  }
  revalidatePath("/companies");
  redirect("/companies?notice=deleted");
}

/** Invite someone from the company. They'll only ever see this company's jobs. */
export async function inviteCompanyUser(input: { companyId: string; email: string; name: string }): Promise<InviteResult> {
  await requireSuperAdmin();
  const companyId = idSchema.safeParse(input.companyId);
  if (!companyId.success) return { ok: false, message: "This company no longer exists." };
  try {
    const created = await apiFetch<{ message: string; link: string }>(`/companies/${companyId.data}/invites`, {
      method: "POST",
      body: { email: input.email, name: input.name },
    });
    revalidatePath(`/companies/${companyId.data}`);
    return { ok: true, message: created.message, link: created.link };
  } catch (error) {
    if (!(error instanceof ApiError)) throw error;
    return { ok: false, message: error.message, ...(Object.keys(error.fields).length ? { errors: error.fields } : {}) };
  }
}
