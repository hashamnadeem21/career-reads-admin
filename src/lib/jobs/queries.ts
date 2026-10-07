import "server-only";
import { cache } from "react";
import { apiFetch, apiGetOrNull } from "@/lib/api/client";
import type { JobRow } from "@/lib/api/types";
import type { SessionUser } from "@/lib/auth/session";

export const JOB_STATUS_FILTERS = ["live", "draft", "review", "scheduled", "expired"] as const;
export type JobStatusFilter = (typeof JOB_STATUS_FILTERS)[number];

const SORTS = { posted: true, deadline: true, title: true, updated: true } as const;
export type JobSort = keyof typeof SORTS;

export const PAGE_SIZE = 20;

export interface JobListParams {
  q?: string;
  status?: JobStatusFilter;
  category?: string;
  /** Staff only: one company account's jobs. */
  company?: string;
  page?: number;
  sort?: JobSort;
  dir?: "asc" | "desc";
}

export function parseJobListParams(sp: Record<string, string | string[] | undefined>): JobListParams {
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)?.trim() || undefined;
  const status = one(sp.status);
  const sort = one(sp.sort);
  const page = Number.parseInt(one(sp.page) ?? "1", 10);
  return {
    q: one(sp.q)?.slice(0, 100),
    status: (JOB_STATUS_FILTERS as readonly string[]).includes(status ?? "") ? (status as JobStatusFilter) : undefined,
    category: one(sp.category)?.slice(0, 80),
    company: /^[0-9a-f-]{36}$/i.test(one(sp.company) ?? "") ? one(sp.company) : undefined,
    page: Number.isFinite(page) && page > 0 ? page : 1,
    sort: sort && sort in SORTS ? (sort as JobSort) : "updated",
    dir: one(sp.dir) === "asc" ? "asc" : "desc",
  };
}

export interface JobListRow {
  job: JobRow;
  categoryName: string | null;
  accountName: string | null;
}

/**
 * Jobs this user may see, filtered and paged, plus the status tab counts. The API scopes
 * company accounts to their own company's jobs (the `user` argument is only for callers' clarity).
 */
export function listJobs(_user: SessionUser, params: JobListParams) {
  return apiFetch<{
    rows: JobListRow[];
    total: number;
    page: number;
    pageSize: number;
    counts: Record<JobStatusFilter | "all", number>;
  }>("/jobs", { query: { ...params }, dates: true });
}

/** One request per page for a job and its stats. 404 (or another company's job) → null. */
const fetchJob = cache((slug: string) =>
  apiGetOrNull<{ job: JobRow; stats: { views: number; applies: number } }>(`/jobs/${encodeURIComponent(slug)}`, {
    dates: true,
  }),
);

/**
 * One job, or null if it doesn't exist OR this user may not see it
 * (so company accounts can't tell other companies' jobs apart from missing ones).
 */
export async function getJob(slug: string): Promise<JobRow | null> {
  return (await fetchJob(slug))?.job ?? null;
}

/** All-time views and apply clicks for one job page. */
export async function getJobStats(slug: string): Promise<{ views: number; applies: number }> {
  return (await fetchJob(slug))?.stats ?? { views: 0, applies: 0 };
}

export function getJobCategories(): Promise<{ slug: string; name: string }[]> {
  return apiFetch("/jobs/options");
}
