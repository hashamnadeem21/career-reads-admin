import "server-only";
import { and, asc, count, eq, ilike, or, sql, type SQL } from "drizzle-orm";
import { getDb } from "@/db";
import { categories, jobs, type JobRow } from "@/db/schema";
import { isProduction } from "@/lib/env";

export const JOB_STATUS_FILTERS = ["live", "draft", "scheduled", "expired"] as const;
export type JobStatusFilter = (typeof JOB_STATUS_FILTERS)[number];

const live = () =>
  sql`(${jobs.status} = 'published' and ${jobs.postedAt} <= now() and (${jobs.deadline} is null or ${jobs.deadline} + interval '1 day' > now()))`;

export function jobStatusCondition(status: JobStatusFilter): SQL {
  switch (status) {
    case "live":
      return live();
    case "draft":
      return eq(jobs.status, "draft");
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
    page: Number.isFinite(page) && page > 0 ? page : 1,
    sort: sort && sort in SORTS ? (sort as JobSort) : "updated",
    dir: one(sp.dir) === "asc" ? "asc" : "desc",
  };
}

function escapeLike(value: string) {
  return value.replace(/[\\%_]/g, (c) => `\\${c}`);
}

export async function listJobs(params: JobListParams) {
  const db = getDb();
  const where: SQL[] = [];
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
      .select({ job: jobs, categoryName: categories.name })
      .from(jobs)
      .leftJoin(categories, eq(categories.slug, jobs.category))
      .where(condition)
      .orderBy(order, asc(jobs.slug))
      .limit(PAGE_SIZE)
      .offset((page - 1) * PAGE_SIZE),
    db.select({ total: count() }).from(jobs).where(condition),
  ]);
  return { rows, total, page, pageSize: PAGE_SIZE };
}

export async function jobStatusCounts(): Promise<Record<JobStatusFilter | "all", number>> {
  const db = getDb();
  const [row] = await db
    .select({
      all: count(),
      live: sql<number>`count(*) filter (where ${jobStatusCondition("live")})`.mapWith(Number),
      draft: sql<number>`count(*) filter (where ${jobStatusCondition("draft")})`.mapWith(Number),
      scheduled: sql<number>`count(*) filter (where ${jobStatusCondition("scheduled")})`.mapWith(Number),
      expired: sql<number>`count(*) filter (where ${jobStatusCondition("expired")})`.mapWith(Number),
    })
    .from(jobs);
  return row;
}

export async function getJob(slug: string): Promise<JobRow | null> {
  const [row] = await getDb().select().from(jobs).where(eq(jobs.slug, slug)).limit(1);
  return row ?? null;
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

