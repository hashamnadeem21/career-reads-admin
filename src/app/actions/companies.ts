"use server";

import { eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getDb } from "@/db";
import { companies, jobs, sessions, users } from "@/db/schema";
import { logAudit } from "@/lib/audit";
import { createInvite, type InviteResult } from "@/lib/auth/invites";
import { requireSuperAdmin } from "@/lib/auth/require-user";
import type { FormState } from "@/lib/form-state";
import { revalidateSite } from "@/lib/revalidate-site";

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

async function nameTaken(name: string, exceptId?: string): Promise<boolean> {
  const [row] = await getDb().select({ id: companies.id }).from(companies).where(eq(companies.name, name)).limit(1);
  return Boolean(row && row.id !== exceptId);
}

export async function createCompany(_prev: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireSuperAdmin();
  const parsed = readCompanyForm(formData);
  const values = { name: String(formData.get("name") ?? ""), website: String(formData.get("website") ?? "") };
  if (!parsed.success) return { errors: z.flattenError(parsed.error).fieldErrors, values };
  if (await nameTaken(parsed.data.name)) return { errors: { name: ["A company with this name already exists"] }, values };

  const [company] = await getDb()
    .insert(companies)
    .values({ name: parsed.data.name, website: parsed.data.website ?? null, autoPublish: parsed.data.autoPublish })
    .returning();
  await logAudit(admin, "created", "company", company.id, company.name);
  revalidatePath("/companies");
  redirect(`/companies/${company.id}?notice=created`);
}

/** Rename, change website or trust level. Renaming updates the name shown on all its jobs. */
export async function updateCompany(_prev: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireSuperAdmin();
  const id = idSchema.parse(formData.get("id"));
  const parsed = readCompanyForm(formData);
  const values = { name: String(formData.get("name") ?? ""), website: String(formData.get("website") ?? "") };
  if (!parsed.success) return { errors: z.flattenError(parsed.error).fieldErrors, values };
  if (await nameTaken(parsed.data.name, id)) return { errors: { name: ["A company with this name already exists"] }, values };

  const db = getDb();
  const [before] = await db.select().from(companies).where(eq(companies.id, id)).limit(1);
  if (!before) return { message: "This company no longer exists." };
  await db.transaction(async (tx) => {
    await tx
      .update(companies)
      .set({ name: parsed.data.name, website: parsed.data.website ?? null, autoPublish: parsed.data.autoPublish })
      .where(eq(companies.id, id));
    if (before.name !== parsed.data.name) await tx.update(jobs).set({ company: parsed.data.name }).where(eq(jobs.companyId, id));
  });
  await logAudit(admin, "updated", "company", id, parsed.data.name);
  if (before.name !== parsed.data.name) await revalidateSite({ tags: ["jobs"], paths: ["/", "/jobs"] });
  revalidatePath("/companies");
  revalidatePath(`/companies/${id}`);
  return { ok: true, message: "Saved." };
}

/** Pausing signs everyone at the company out and blocks sign-in. Their jobs stay as they are. */
export async function setCompanyActive(id: string, active: boolean): Promise<{ ok: boolean; message: string }> {
  const admin = await requireSuperAdmin();
  const companyId = idSchema.parse(id);
  const db = getDb();
  const [company] = await db.update(companies).set({ active: z.boolean().parse(active) }).where(eq(companies.id, companyId)).returning();
  if (!company) return { ok: false, message: "This company no longer exists." };
  if (!active) {
    const members = await db.select({ id: users.id }).from(users).where(eq(users.companyId, companyId));
    if (members.length) await db.delete(sessions).where(inArray(sessions.userId, members.map((m) => m.id)));
  }
  await logAudit(admin, active ? "reactivated" : "paused", "company", company.id, company.name);
  revalidatePath("/companies");
  revalidatePath(`/companies/${companyId}`);
  return { ok: true, message: active ? `${company.name} can sign in again.` : `${company.name} is paused and signed out.` };
}

/**
 * Deletes the company and its user accounts. Its jobs are kept (as Career Reads jobs,
 * with their stats) so nothing disappears from the site by accident.
 */
export async function deleteCompany(id: string): Promise<void> {
  const admin = await requireSuperAdmin();
  const companyId = idSchema.parse(id);
  const [company] = await getDb().delete(companies).where(eq(companies.id, companyId)).returning();
  if (company) await logAudit(admin, "deleted", "company", null, company.name);
  revalidatePath("/companies");
  redirect("/companies?notice=deleted");
}

/** Invite someone from the company. They'll only ever see this company's jobs. */
export async function inviteCompanyUser(input: { companyId: string; email: string; name: string }): Promise<InviteResult> {
  const admin = await requireSuperAdmin();
  const parsed = z
    .object({
      companyId: idSchema,
      email: z.string().trim().toLowerCase().pipe(z.email("Enter a valid email")),
      name: z.string().trim().min(2, "Enter their name").max(80),
    })
    .safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      message: "Please fix the highlighted fields.",
      errors: Object.fromEntries(parsed.error.issues.map((i) => [String(i.path[0]), i.message])),
    };
  }
  const [company] = await getDb().select().from(companies).where(eq(companies.id, parsed.data.companyId)).limit(1);
  if (!company) return { ok: false, message: "This company no longer exists." };
  if (!company.active) return { ok: false, message: "Reactivate the company before inviting people." };
  const result = await createInvite(admin, { email: parsed.data.email, name: parsed.data.name, role: "company", companyId: company.id });
  revalidatePath(`/companies/${company.id}`);
  return result;
}
