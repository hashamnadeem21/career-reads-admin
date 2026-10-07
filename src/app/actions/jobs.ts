"use server";

import { revalidatePath } from "next/cache";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import { ApiError, apiFetch, formErrors } from "@/lib/api/client";
import type { JobRow } from "@/lib/api/types";
import { requireStaff, requireUser } from "@/lib/auth/require-user";
import type { FormState } from "@/lib/form-state";
import { JOB_LIST_FIELDS, parseJobForm } from "@/lib/jobs/form";
import { SLUG_PATTERN } from "@/shared/content/schema";

/**
 * Job actions are open to every signed-in role. The API scopes company accounts to their own
 * company's jobs (another company's job is a 404), sends untrusted companies' publishes to
 * review, audits every change and refreshes the site.
 */

const slugSchema = z.string().regex(SLUG_PATTERN).max(100);
const jobPath = (slug: string, action = "") => `/jobs/${slugSchema.parse(slug)}${action ? `/${action}` : ""}`;

/** A 404 from the API (missing, or another company's job) becomes the admin's not-found page. */
function rethrow(error: unknown): never {
  if (error instanceof ApiError && error.status === 404) notFound();
  throw error;
}

function message(error: unknown): { ok: false; message: string } {
  if (error instanceof ApiError && error.status !== 404) return { ok: false, message: error.message };
  rethrow(error);
}

/** The form's fields as the JSON the API takes (strings as typed; blanks mean "not set"). */
function jobBody(formData: FormData, slug: string) {
  const text = (key: string) => {
    const v = formData.get(key);
    return typeof v === "string" ? v : "";
  };
  const lists = Object.fromEntries(
    JOB_LIST_FIELDS.map((key) => [key, formData.getAll(key).filter((v): v is string => typeof v === "string")]),
  );
  return {
    slug,
    title: text("title"),
    company: text("company"),
    companyWebsite: text("companyWebsite"),
    city: text("city"),
    country: text("country"),
    workModel: text("workModel"),
    employmentType: text("employmentType"),
    category: text("category"),
    experience: text("experience"),
    salary: text("salary"),
    summary: text("summary"),
    ...lists,
    applyUrl: text("applyUrl"),
    applyEmail: text("applyEmail"),
    postedAt: text("postedAt"),
    deadline: text("deadline"),
    status: text("status") === "published" ? "published" : "draft",
    featured: formData.get("featured") === "on",
    companyId: text("companyId"),
  };
}

/** Create or update a job (the form posts `originalSlug` when editing). */
export async function saveJob(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireUser();
  const parsed = parseJobForm(formData);
  if (!parsed.data) return { errors: parsed.errors, values: parsed.values, message: "Please fix the highlighted fields." };
  const { slug, originalSlug } = parsed;

  let saved: { job: JobRow; notice: string };
  try {
    saved = await apiFetch(originalSlug ? jobPath(originalSlug) : "/jobs", {
      method: originalSlug ? "PATCH" : "POST",
      body: jobBody(formData, slug),
    });
  } catch (error) {
    if (!(error instanceof ApiError)) throw error;
    if (error.status === 404) return { message: "This job no longer exists. It may have been deleted.", values: parsed.values };
    return Object.keys(error.fields).length
      ? { errors: formErrors(error), values: parsed.values, message: "Please fix the highlighted fields." }
      : { message: error.message, values: parsed.values };
  }
  revalidatePath("/jobs");
  redirect(`/jobs/${saved.job.slug}?notice=${saved.notice}`);
}

/** Copy a job into a new draft ("Frontend Developer (copy)"), owned by the same company. */
export async function duplicateJob(slug: string): Promise<void> {
  await requireUser();
  let copy: { slug: string };
  try {
    copy = await apiFetch(jobPath(slug, "duplicate"), { method: "POST" });
  } catch (error) {
    rethrow(error);
  }
  revalidatePath("/jobs");
  redirect(`/jobs/${copy.slug}?notice=duplicated`);
}

/** Close applications now: the deadline becomes yesterday, so the job leaves the site immediately. */
export async function closeJobNow(slug: string): Promise<{ ok: boolean; message: string }> {
  await requireUser();
  try {
    const result = await apiFetch<{ message: string }>(jobPath(slug, "close"), { method: "POST" });
    revalidatePath("/jobs");
    return { ok: true, ...result };
  } catch (error) {
    return message(error);
  }
}

/** Publish / unpublish. For companies that aren't trusted, "publish" sends the job for review. */
export async function setJobStatus(slug: string, status: "draft" | "published"): Promise<{ ok: boolean; message: string }> {
  await requireUser();
  try {
    const result = await apiFetch<{ message: string }>(jobPath(slug, "status"), {
      method: "POST",
      body: { status: z.enum(["draft", "published"]).parse(status) },
    });
    revalidatePath("/jobs");
    return { ok: true, ...result };
  } catch (error) {
    return message(error);
  }
}

export async function deleteJob(slug: string): Promise<void> {
  await requireUser();
  try {
    await apiFetch(jobPath(slug), { method: "DELETE" });
  } catch (error) {
    rethrow(error);
  }
  revalidatePath("/jobs");
  redirect("/jobs?notice=deleted");
}

export async function bulkJobs(input: { action: string; slugs: string[] }): Promise<{ ok: boolean; message: string }> {
  await requireUser();
  try {
    const result = await apiFetch<{ message: string }>("/jobs/bulk", { method: "POST", body: input });
    revalidatePath("/jobs");
    return { ok: true, ...result };
  } catch (error) {
    if (error instanceof ApiError) return { ok: false, message: error.message };
    throw error;
  }
}

/** Staff: approve a company's job. It goes live (or is scheduled) right away. */
export async function approveJob(slug: string): Promise<{ ok: boolean; message: string }> {
  await requireStaff();
  try {
    const result = await apiFetch<{ message: string }>(jobPath(slug, "approve"), { method: "POST" });
    revalidatePath("/jobs");
    return { ok: true, ...result };
  } catch (error) {
    return message(error);
  }
}

/** Staff: send a company's job back with a note explaining what to change. */
export async function rejectJob(slug: string, note: string): Promise<{ ok: boolean; message: string }> {
  await requireStaff();
  try {
    const result = await apiFetch<{ message: string }>(jobPath(slug, "reject"), { method: "POST", body: { note } });
    revalidatePath("/jobs");
    return { ok: true, ...result };
  } catch (error) {
    if (error instanceof ApiError && error.fields.note) return { ok: false, message: error.fields.note };
    return message(error);
  }
}
