"use server";

import { and, desc, ilike, or } from "drizzle-orm";
import { getDb } from "@/db";
import { articles, jobs } from "@/db/schema";
import { requireUser } from "@/lib/auth/require-user";
import { jobScope } from "@/lib/jobs/access";

export interface SearchHit {
  kind: "post" | "job";
  slug: string;
  title: string;
  href: string;
}

/** Title/slug search for the ⌘K palette: posts and jobs for staff, only their own jobs for companies. */
export async function searchEverything(query: string): Promise<SearchHit[]> {
  const user = await requireUser();
  const staff = user.role !== "company";
  const q = query.trim().slice(0, 80);
  if (q.length < 2) return [];
  const pattern = `%${q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
  const db = getDb();
  const [posts, jobRows] = await Promise.all([
    staff
      ? db
          .select({ slug: articles.slug, title: articles.title })
          .from(articles)
          .where(or(ilike(articles.title, pattern), ilike(articles.slug, pattern)))
          .orderBy(desc(articles.savedAt))
          .limit(6)
      : Promise.resolve([]),
    db
      .select({ slug: jobs.slug, title: jobs.title, company: jobs.company })
      .from(jobs)
      .where(and(jobScope(user), or(ilike(jobs.title, pattern), ilike(jobs.company, pattern), ilike(jobs.slug, pattern))))
      .orderBy(desc(jobs.updatedAt))
      .limit(6),
  ]);
  return [
    ...posts.map((p) => ({ kind: "post" as const, slug: p.slug, title: p.title, href: `/posts/${p.slug}` })),
    ...jobRows.map((j) => ({ kind: "job" as const, slug: j.slug, title: `${j.title} · ${j.company}`, href: `/jobs/${j.slug}` })),
  ];
}
