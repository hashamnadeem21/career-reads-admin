"use server";

import { and, eq, inArray, like, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getDb } from "@/db";
import { categories, dailyStats, jobs } from "@/db/schema";
import { logAudit } from "@/lib/audit";
import { requireUser } from "@/lib/auth/require-user";
import type { FormState } from "@/lib/form-state";
import { parseJobForm } from "@/lib/jobs/form";
import { revalidateSite } from "@/lib/revalidate-site";
import { SLUG_PATTERN } from "@/shared/content/schema";
import type { JobInput } from "@/shared/jobs/schema";

/** Everything on the public site that shows jobs. */
async function refreshSite(...slugs: string[]) {
  const result = await revalidateSite({
    tags: ["jobs"],
    paths: ["/", "/jobs", "/sitemap.xml", ...slugs.map((s) => `/jobs/${s}`)],
  });
  revalidatePath("/", "layout");
  return result;
}

function toRow(data: JobInput) {
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
    status: data.status,
    featured: data.featured,
    sample: false,
    updatedAt: new Date(),
  };
}

const slugSchema = z.string().regex(SLUG_PATTERN).max(100);

/** Create or update a job (the form posts `originalSlug` when editing). */
export async function saveJob(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const parsed = parseJobForm(formData);
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

  if (slug !== originalSlug) {
    const [taken] = await db.select({ slug: jobs.slug }).from(jobs).where(eq(jobs.slug, slug)).limit(1);
    if (taken) return { errors: { slug: ["Another job already uses this slug"] }, values: parsed.values };
  }

  let wasPublished = false;
  if (originalSlug) {
    const [existing] = await db.select().from(jobs).where(eq(jobs.slug, originalSlug)).limit(1);
    if (!existing) return { message: "This job no longer exists. It may have been deleted.", values: parsed.values };
    wasPublished = existing.status === "published";
    await db.transaction(async (tx) => {
      await tx.update(jobs).set({ ...toRow(data), slug }).where(eq(jobs.slug, originalSlug));
      if (slug !== originalSlug) {
        // Keep the job's stats when its URL changes.
        await tx
          .update(dailyStats)
          .set({ entitySlug: slug, path: `/jobs/${slug}` })
          .where(and(eq(dailyStats.path, `/jobs/${originalSlug}`)));
      }
    });
  } else {
    await db.insert(jobs).values({ ...toRow(data), slug, createdBy: user.id });
  }

  const action = !originalSlug
    ? data.status === "published" ? "published" : "created"
    : data.status === "published" && !wasPublished ? "published" : data.status === "draft" && wasPublished ? "unpublished" : "updated";
  await logAudit(user, action, "job", slug, data.title);
  const site = await refreshSite(slug, ...(originalSlug && originalSlug !== slug ? [originalSlug] : []));

  const notice = site.ok ? "saved" : "saved-offline";
  redirect(`/jobs/${slug}?notice=${notice}`);
}

async function loadJob(slug: string) {
  const [job] = await getDb().select().from(jobs).where(eq(jobs.slug, slugSchema.parse(slug))).limit(1);
  if (!job) throw new Error("Job not found");
  return job;
}

/** Copy a job into a new draft ("Frontend Developer (copy)"). */
export async function duplicateJob(slug: string): Promise<void> {
  const user = await requireUser();
  const job = await loadJob(slug);
  const db = getDb();
  const base = `${job.slug.slice(0, 90)}-copy`;
  const existing = await db.select({ slug: jobs.slug }).from(jobs).where(like(jobs.slug, `${base}%`));
  const taken = new Set(existing.map((r) => r.slug));
  let newSlug = base;
  for (let n = 2; taken.has(newSlug); n++) newSlug = `${base}-${n}`;

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { slug: _old, createdAt, createdBy, updatedAt, ...rest } = job;
  await db.insert(jobs).values({
    ...rest,
    slug: newSlug,
    title: `${job.title} (copy)`.slice(0, 100),
    status: "draft",
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
  const job = await loadJob(slug);
  const yesterday = new Date();
  yesterday.setUTCHours(0, 0, 0, 0);
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  await getDb().update(jobs).set({ deadline: yesterday, updatedAt: new Date() }).where(eq(jobs.slug, job.slug));
  await logAudit(user, "closed", "job", job.slug, job.title);
  const site = await refreshSite(job.slug);
  return { ok: true, message: site.ok ? "Job closed. It's no longer on the site." : "Job closed. The site will update within the hour." };
}

export async function setJobStatus(slug: string, status: "draft" | "published"): Promise<{ ok: boolean; message: string }> {
  const user = await requireUser();
  const job = await loadJob(slug);
  await getDb().update(jobs).set({ status, updatedAt: new Date() }).where(eq(jobs.slug, job.slug));
  await logAudit(user, status === "published" ? "published" : "unpublished", "job", job.slug, job.title);
  const site = await refreshSite(job.slug);
  const verb = status === "published" ? "Published" : "Unpublished";
  return { ok: true, message: site.ok ? `${verb}.` : `${verb}. The site will update within the hour.` };
}

export async function deleteJob(slug: string): Promise<void> {
  const user = await requireUser();
  const job = await loadJob(slug);
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
  const rows = await db.select({ slug: jobs.slug, title: jobs.title }).from(jobs).where(inArray(jobs.slug, slugs));
  if (rows.length === 0) return { ok: false, message: "Nothing to update." };
  const found = rows.map((r) => r.slug);

  if (action === "delete") {
    await db.transaction(async (tx) => {
      await tx.delete(jobs).where(inArray(jobs.slug, found));
      await tx.delete(dailyStats).where(inArray(dailyStats.path, found.map((s) => `/jobs/${s}`)));
    });
  } else {
    await db
      .update(jobs)
      .set({ status: action === "publish" ? "published" : "draft", updatedAt: sql`now()` })
      .where(inArray(jobs.slug, found));
  }
  const verb = action === "delete" ? "deleted" : action === "publish" ? "published" : "unpublished";
  for (const r of rows) await logAudit(user, verb, "job", r.slug, r.title);
  await refreshSite(...found);
  return { ok: true, message: `${rows.length} job${rows.length === 1 ? "" : "s"} ${verb}.` };
}
