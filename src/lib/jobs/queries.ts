import "server-only";
import { and, asc, count, eq, ilike, or, sql, type SQL } from "drizzle-orm";
import { getDb } from "@/db";
import { categories, companies, jobs, type JobRow } from "@/db/schema";
import type { SessionUser } from "@/lib/auth/session";
import { isProduction } from "@/lib/env";
import { canAccessJob, jobScope } from "./access";

export const JOB_STATUS_FILTERS = ["live", "draft", "review", "scheduled", "expired"] as const;
export type JobStatusFilter = (typeof JOB_STATUS_FILTERS)[number];

const live = () =>
  sql`(${jobs.status} = 'published' and ${jobs.postedAt} <= now() and (${jobs.deadline} is null or ${jobs.deadline} + interval '1 day' > now()))`;

export function jobStatusCondition(status: JobStatusFilter): SQL {
  switch (status) {
    case "live":
      return live();
    case "draft":
      return sql`(${jobs.status} = 'draft' and ${jobs.review} is distinct from 'pending')`;
    case "review":
      return eq(jobs.review, "pending");
    case "scheduled":
      return sql`(${jobs.status} = 'published' and ${jobs.postedAt} > now())`;
    case "expired":
      return sql`(${jobs.status} = 'published' and ${jobs.deadline} is not null and ${jobs.deadline} + interval '1 day' <= now())`;
  }
}

const SORTS = {
  posted: jobs.postedAt,
  deadline: jobs.deadline,
  title: jobs.title,
  updated: jobs.updatedAt,
} as const;
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

function escapeLike(value: string) {
  return value.replace(/[\\%_]/g, (c) => `\\${c}`);
}

/** Jobs this user may see (company accounts: only their own), filtered and paged. */
export async function listJobs(user: SessionUser, params: JobListParams) {
  const db = getDb();
  const where: SQL[] = [];
  const scope = jobScope(user);
  if (scope) where.push(scope);
  else if (params.company) where.push(eq(jobs.companyId, params.company));
  if (params.q) {
    const p = `%${escapeLike(params.q)}%`;
    where.push(or(ilike(jobs.title, p), ilike(jobs.company, p), ilike(jobs.city, p), ilike(jobs.slug, p))!);
  }
  if (params.status) where.push(jobStatusCondition(params.status));
  if (params.category) where.push(eq(jobs.category, params.category));
  const condition = where.length ? and(...where) : undefined;
  const column = SORTS[params.sort ?? "updated"];
  const order = params.dir === "asc" ? sql`${column} asc nulls last` : sql`${column} desc nulls last`;
  const page = params.page ?? 1;

  const [rows, [{ total }]] = await Promise.all([
    db
      .select({ job: jobs, categoryName: categories.name, accountName: companies.name })
      .from(jobs)
      .leftJoin(categories, eq(categories.slug, jobs.category))
      .leftJoin(companies, eq(companies.id, jobs.companyId))
      .where(condition)
      .orderBy(order, asc(jobs.slug))
      .limit(PAGE_SIZE)
      .offset((page - 1) * PAGE_SIZE),
    db.select({ total: count() }).from(jobs).where(condition),
  ]);
  return { rows, total, page, pageSize: PAGE_SIZE };
}

export async function jobStatusCounts(user: SessionUser): Promise<Record<JobStatusFilter | "all", number>> {
  const db = getDb();
  const [row] = await db
    .select({
      all: count(),
      live: sql<number>`count(*) filter (where ${jobStatusCondition("live")})`.mapWith(Number),
      draft: sql<number>`count(*) filter (where ${jobStatusCondition("draft")})`.mapWith(Number),
      review: sql<number>`count(*) filter (where ${jobStatusCondition("review")})`.mapWith(Number),
      scheduled: sql<number>`count(*) filter (where ${jobStatusCondition("scheduled")})`.mapWith(Number),
      expired: sql<number>`count(*) filter (where ${jobStatusCondition("expired")})`.mapWith(Number),
    })
    .from(jobs)
    .where(jobScope(user));
  return row;
}

/** Number of company jobs waiting for review (staff badge). */
export async function pendingReviewCount(): Promise<number> {
  const [{ n }] = await getDb().select({ n: count() }).from(jobs).where(eq(jobs.review, "pending"));
  return n;
}

/**
 * One job, or null if it doesn't exist OR this user may not see it
 * (so company accounts can't tell other companies' jobs apart from missing ones).
 */
export async function getJob(slug: string, user: SessionUser): Promise<JobRow | null> {
  const [row] = await getDb().select().from(jobs).where(eq(jobs.slug, slug)).limit(1);
  return row && canAccessJob(user, row) ? row : null;
}

export async function getJobCategories() {
  return getDb()
    .select({ slug: categories.slug, name: categories.name })
    .from(categories)
    .where(eq(categories.kind, "job"))
    .orderBy(asc(categories.sortOrder), asc(categories.name));
}

/** All-time views and apply clicks for one job page. */
export async function getJobStats(slug: string): Promise<{ views: number; applies: number }> {
  const [row] = await getDb().execute<{ views: number; applies: number }>(sql`
    select coalesce(sum(count) filter (where kind = 'view'), 0)::int as views,
           coalesce(sum(count) filter (where kind = 'apply_click'), 0)::int as applies
    from daily_stats where path = ${`/jobs/${slug}`}`).then((r) => r.rows);
  return { views: Number(row?.views ?? 0), applies: Number(row?.applies ?? 0) };
}

/** Whether samples are hidden on the live site (production builds). */
export const samplesHidden = isProduction;

