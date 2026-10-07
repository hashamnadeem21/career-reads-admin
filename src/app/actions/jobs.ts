"use server";

import { and, eq, inArray, like } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import { getDb } from "@/db";
import { categories, companies, dailyStats, jobs, type JobRow } from "@/db/schema";
import { logAudit } from "@/lib/audit";
import { requireStaff, requireUser } from "@/lib/auth/require-user";
import type { SessionUser } from "@/lib/auth/session";
import type { FormState } from "@/lib/form-state";
import { canAccessJob, jobScope, resolvePublishing, type Publishing } from "@/lib/jobs/access";
import { parseJobForm } from "@/lib/jobs/form";
import { revalidateSite } from "@/lib/revalidate-site";
import { SLUG_PATTERN } from "@/shared/content/schema";
import type { JobInput } from "@/shared/jobs/schema";

/**
 * Job actions are open to every signed-in role, so each one loads the job through
 * `canAccessJob`: company accounts can only ever touch their own company's jobs.
 */

/** Everything on the public site that shows jobs. */
async function refreshSite(...slugs: string[]) {
  const result = await revalidateSite({
    tags: ["jobs"],
    paths: ["/", "/jobs", "/sitemap.xml", ...slugs.map((s) => `/jobs/${s}`)],
  });
  revalidatePath("/", "layout");
  return result;
}

function toRow(data: JobInput, publishing: Publishing) {
  return {
    title: data.title,
    company: data.company,
    companyWebsite: data.companyWebsite ?? null,
    city: data.city ?? null,
    country: data.country,
    workModel: data.workModel,
    employmentType: data.employmentType,
    category: data.category,
    experience: data.experience,
    salary: data.salary ?? null,
    summary: data.summary,
    responsibilities: data.responsibilities,
    requirements: data.requirements,
    benefits: data.benefits,
    applyUrl: data.applyUrl ?? null,
    applyEmail: data.applyEmail ?? null,
    postedAt: new Date(data.postedAt),
    deadline: data.deadline ? new Date(data.deadline) : null,
    status: publishing.status,
    review: publishing.review,
    featured: data.featured,
    sample: false,
    updatedAt: new Date(),
  };
}

const slugSchema = z.string().regex(SLUG_PATTERN).max(100);

/** Loads a job the user may access, or 404s (never reveals other companies' jobs). */
async function loadJob(user: SessionUser, slug: string): Promise<JobRow> {
  const [job] = await getDb().select().from(jobs).where(eq(jobs.slug, slugSchema.parse(slug))).limit(1);
  if (!job || !canAccessJob(user, job)) notFound();
  return job;
}

function auditVerb(before: Publishing | null, after: Publishing): string {
  if (after.review === "pending" && before?.review !== "pending") return "submitted for review";
  if (after.status === "published" && before?.status !== "published") return "published";
  if (after.status === "draft" && before?.status === "published") return "unpublished";
  return before ? "updated" : "created";
}

/**
 * Create or update a job (the form posts `originalSlug` when editing).
 * Company accounts: the company name comes from their account, "Featured" is left
 * as it was, and publishing goes through review unless the company is trusted.
 */
export async function saveJob(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const parsed = parseJobForm(formData);
  if (user.role === "company" && parsed.data) parsed.data.company = user.companyName ?? parsed.data.company;
  if (!parsed.data) {
    return { errors: parsed.errors, values: parsed.values, message: "Please fix the highlighted fields." };
  }
  const { data, slug, originalSlug } = parsed;
  const db = getDb();

  const [category] = await db
    .select()
    .from(categories)
    .where(and(eq(categories.slug, data.category), eq(categories.kind, "job")))
    .limit(1);
  if (!category) return { errors: { category: ["Pick a job category"] }, values: parsed.values };

  let existing: JobRow | null = null;
  if (originalSlug) {
    const [row] = await db.select().from(jobs).where(eq(jobs.slug, originalSlug)).limit(1);
    if (!row || !canAccessJob(user, row)) return { message: "This job no longer exists. It may have been deleted.", values: parsed.values };
    existing = row;
  }

  // Which company account owns the job.
  let companyId: string | null;
  if (user.role === "company") {
    companyId = user.companyId;
    data.featured = existing?.featured ?? false; // featuring is a Career Reads decision
  } else {
    const requested = String(formData.get("companyId") ?? "");
    companyId = z.uuid().safeParse(requested).success ? requested : null;
    if (companyId) {
      const [company] = await db.select({ name: companies.name }).from(companies).where(eq(companies.id, companyId)).limit(1);
      if (!company) return { errors: { companyId: ["That company no longer exists"] }, values: parsed.values };
      data.company = company.name; // company-account jobs always show the account's name
    }
  }

  if (slug !== originalSlug) {
    const [taken] = await db.select({ slug: jobs.slug }).from(jobs).where(eq(jobs.slug, slug)).limit(1);
    if (taken) return { errors: { slug: ["This address is already used by another job. Try a different one."] }, values: parsed.values };
  }

  const before = existing ? { status: existing.status, review: existing.review } : null;
  const publishing = resolvePublishing(user, data.status, existing ? { companyId, review: existing.review } : { companyId, review: null });
  const row = { ...toRow(data, publishing), companyId, reviewNote: publishing.review === "rejected" ? existing?.reviewNote ?? null : null };

  if (existing && originalSlug) {
    await db.transaction(async (tx) => {
      await tx.update(jobs).set({ ...row, slug }).where(eq(jobs.slug, originalSlug));
      if (slug !== originalSlug) {
        // Keep the job's stats when its URL changes.
        await tx.update(dailyStats).set({ entitySlug: slug, path: `/jobs/${slug}` }).where(eq(dailyStats.path, `/jobs/${originalSlug}`));
      }
    });
  } else {
    await db.insert(jobs).values({ ...row, slug, createdBy: user.id });
  }

  await logAudit(user, auditVerb(before, publishing), "job", slug, data.title);
  const site = await refreshSite(slug, ...(originalSlug && originalSlug !== slug ? [originalSlug] : []));
  revalidatePath("/jobs");

  const notice = publishing.review === "pending" && before?.review !== "pending" ? "submitted" : site.ok ? "saved" : "saved-offline";
  redirect(`/jobs/${slug}?notice=${notice}`);
}

/** Copy a job into a new draft ("Frontend Developer (copy)"), owned by the same company. */
export async function duplicateJob(slug: string): Promise<void> {
  const user = await requireUser();
  const job = await loadJob(user, slug);
  const db = getDb();
  const base = `${job.slug.slice(0, 90)}-copy`;
  const existing = await db.select({ slug: jobs.slug }).from(jobs).where(like(jobs.slug, `${base}%`));
  const taken = new Set(existing.map((r) => r.slug));
  let newSlug = base;
  for (let n = 2; taken.has(newSlug); n++) newSlug = `${base}-${n}`;

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { slug: _old, createdAt, createdBy, updatedAt, review, reviewNote, ...rest } = job;
  await db.insert(jobs).values({
    ...rest,
    slug: newSlug,
    title: `${job.title} (copy)`.slice(0, 100),
    status: "draft",
    review: null,
    reviewNote: null,
    featured: false,
    sample: false,
    postedAt: new Date(),
    deadline: null,
    createdBy: user.id,
  });
  await logAudit(user, "duplicated", "job", newSlug, job.title);
  revalidatePath("/jobs");
  redirect(`/jobs/${newSlug}?notice=duplicated`);
}

/** Close applications now: the deadline becomes yesterday, so the job leaves the site immediately. */
export async function closeJobNow(slug: string): Promise<{ ok: boolean; message: string }> {
  const user = await requireUser();
  const job = await loadJob(user, slug);
  const yesterday = new Date();
  yesterday.setUTCHours(0, 0, 0, 0);
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  await getDb().update(jobs).set({ deadline: yesterday, updatedAt: new Date() }).where(eq(jobs.slug, job.slug));
  await logAudit(user, "closed", "job", job.slug, job.title);
  const site = await refreshSite(job.slug);
  return { ok: true, message: site.ok ? "Job closed. It's no longer on the site." : "Job closed. The site will update within the hour." };
}

/** Publish / unpublish. For companies that aren't trusted, "publish" sends the job for review. */
export async function setJobStatus(slug: string, status: "draft" | "published"): Promise<{ ok: boolean; message: string }> {
  const user = await requireUser();
  const job = await loadJob(user, slug);
  const requested = z.enum(["draft", "published"]).parse(status);
  const before = { status: job.status, review: job.review };
  const after = resolvePublishing(user, requested, job);
  await getDb()
    .update(jobs)
    .set({ ...after, reviewNote: after.review === "rejected" ? job.reviewNote : null, updatedAt: new Date() })
    .where(eq(jobs.slug, job.slug));
  await logAudit(user, auditVerb(before, after), "job", job.slug, job.title);
  const site = await refreshSite(job.slug);
  revalidatePath("/jobs");
  if (after.review === "pending" && requested === "published") {
    return { ok: true, message: "Sent for review. It goes live as soon as Career Reads approves it." };
  }
  const verb = after.status === "published" ? "Published" : "Unpublished";
  return { ok: true, message: site.ok ? `${verb}.` : `${verb}. The site will update within the hour.` };
}

export async function deleteJob(slug: string): Promise<void> {
  const user = await requireUser();
  const job = await loadJob(user, slug);
  await getDb().transaction(async (tx) => {
    await tx.delete(jobs).where(eq(jobs.slug, job.slug));
    await tx.delete(dailyStats).where(eq(dailyStats.path, `/jobs/${job.slug}`));
  });
  await logAudit(user, "deleted", "job", job.slug, job.title);
  await refreshSite(job.slug);
  redirect("/jobs?notice=deleted");
}

const bulkSchema = z.object({
  action: z.enum(["publish", "unpublish", "delete"]),
  slugs: z.array(slugSchema).min(1).max(100),
});

export async function bulkJobs(input: { action: string; slugs: string[] }): Promise<{ ok: boolean; message: string }> {
  const user = await requireUser();
  const { action, slugs } = bulkSchema.parse(input);
  const db = getDb();
  // Only jobs this user may access are touched; anything else is silently skipped.
  const rows = await db.select().from(jobs).where(and(inArray(jobs.slug, slugs), jobScope(user)));
  if (rows.length === 0) return { ok: false, message: "Nothing to update." };
  const found = rows.map((r) => r.slug);

  let submitted = 0;
  if (action === "delete") {
    await db.transaction(async (tx) => {
      await tx.delete(jobs).where(inArray(jobs.slug, found));
      await tx.delete(dailyStats).where(inArray(dailyStats.path, found.map((s) => `/jobs/${s}`)));
    });
    for (const r of rows) await logAudit(user, "deleted", "job", r.slug, r.title);
  } else {
    const requested = action === "publish" ? "published" : "draft";
    for (const r of rows) {
      const after = resolvePublishing(user, requested, r);
      if (after.review === "pending" && r.review !== "pending") submitted++;
      await db
        .update(jobs)
        .set({ ...after, reviewNote: after.review === "rejected" ? r.reviewNote : null, updatedAt: new Date() })
        .where(eq(jobs.slug, r.slug));
      await logAudit(user, auditVerb({ status: r.status, review: r.review }, after), "job", r.slug, r.title);
    }
  }
  await refreshSite(...found);
  revalidatePath("/jobs");
  const n = `${rows.length} job${rows.length === 1 ? "" : "s"}`;
  if (submitted > 0) return { ok: true, message: `${n} sent for review.` };
  const verb = action === "delete" ? "deleted" : action === "publish" ? "published" : "unpublished";
  return { ok: true, message: `${n} ${verb}.` };
}

/** Staff: approve a company's job. It goes live (or is scheduled) right away. */
export async function approveJob(slug: string): Promise<{ ok: boolean; message: string }> {
  const user = await requireStaff();
  const job = await loadJob(user, slug);
  if (job.review !== "pending") return { ok: false, message: "This job isn't waiting for review." };
  await getDb()
    .update(jobs)
    .set({ status: "published", review: "approved", reviewNote: null, updatedAt: new Date() })
    .where(eq(jobs.slug, job.slug));
  await logAudit(user, "approved", "job", job.slug, job.title);
  const site = await refreshSite(job.slug);
  revalidatePath("/jobs");
  return { ok: true, message: site.ok ? "Approved and published." : "Approved. The site will update within the hour." };
}

const rejectSchema = z.string().trim().min(5, "Tell the company what to change (at least 5 characters)").max(500);

/** Staff: send a company's job back with a note explaining what to change. */
export async function rejectJob(slug: string, note: string): Promise<{ ok: boolean; message: string }> {
  const user = await requireStaff();
  const job = await loadJob(user, slug);
  const parsed = rejectSchema.safeParse(note);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0].message };
  if (job.review !== "pending" && job.status !== "published") return { ok: false, message: "This job isn't waiting for review." };
  await getDb()
    .update(jobs)
    .set({ status: "draft", review: "rejected", reviewNote: parsed.data, updatedAt: new Date() })
    .where(eq(jobs.slug, job.slug));
  await logAudit(user, "sent back", "job", job.slug, job.title);
  await refreshSite(job.slug);
  revalidatePath("/jobs");
  return { ok: true, message: "Sent back to the company with your note." };
}
