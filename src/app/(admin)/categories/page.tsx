import { asc, count } from "drizzle-orm";
import type { Metadata } from "next";
import { GlassPanel, PageHeader } from "@/components/admin/Glass";
import { CategoriesManager, type CategoryItem } from "@/components/categories/CategoriesManager";
import { getDb } from "@/db";
import { articles, categories, jobs } from "@/db/schema";
import { requireUser } from "@/lib/auth/require-user";

export const metadata: Metadata = { title: "Categories" };

export default async function CategoriesPage() {
  await requireUser();
  const db = getDb();
  const [rows, postCounts, jobCounts] = await Promise.all([
    db.select().from(categories).orderBy(asc(categories.sortOrder), asc(categories.name)),
    db.select({ slug: articles.category, n: count() }).from(articles).groupBy(articles.category),
    db.select({ slug: jobs.category, n: count() }).from(jobs).groupBy(jobs.category),
  ]);
  const usage = new Map([...postCounts, ...jobCounts].map((r) => [r.slug, r.n]));
  const items: CategoryItem[] = rows.map((r) => ({
    slug: r.slug,
    kind: r.kind,
    name: r.name,
    headline: r.headline ?? "",
    description: r.description,
    accent: r.accent ?? "",
    usage: usage.get(r.slug) ?? 0,
  }));
  return (
    <>
      <PageHeader title="Categories" description="Blog topics and job categories shown across the site." />
      <GlassPanel className="rise-in">
        <CategoriesManager blog={items.filter((i) => i.kind === "blog")} job={items.filter((i) => i.kind === "job")} />
      </GlassPanel>
    </>
  );
}

