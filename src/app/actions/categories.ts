"use server";

import { asc, count, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getDb } from "@/db";
import { articles, categories, jobs } from "@/db/schema";
import { logAudit } from "@/lib/audit";
import { requireStaff } from "@/lib/auth/require-user";
import { categoryInputSchema, type CategoryInput } from "@/lib/categories/schema";
import { revalidateSite } from "@/lib/revalidate-site";

export interface CategoryResult {
  ok: boolean;
  message: string;
  errors?: Record<string, string>;
}

/** Category names appear across the site (menus, cards, filters), so refresh broadly. */
async function refreshSite(kind: "blog" | "job", ...slugs: string[]) {
  await revalidateSite({
    tags: ["categories", kind === "blog" ? "articles" : "jobs"],
    paths: ["/", "/sitemap.xml", ...(kind === "blog" ? ["/blog", "/about", ...slugs.map((s) => `/category/${s}`)] : ["/jobs"])],
  });
  revalidatePath("/categories");
}

export async function saveCategory(input: CategoryInput): Promise<CategoryResult> {
  const user = await requireStaff();
  const parsed = categoryInputSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      message: "Please fix the highlighted fields.",
      errors: Object.fromEntries(parsed.error.issues.map((i) => [String(i.path[0]), i.message])),
    };
  }
  const data = parsed.data;
  const db = getDb();
  if (data.slug !== data.originalSlug) {
    const [taken] = await db.select({ slug: categories.slug }).from(categories).where(eq(categories.slug, data.slug)).limit(1);
    if (taken) return { ok: false, message: "That slug is taken.", errors: { slug: "Another category (blog or job) already uses this slug" } };
  }
  const values = {
    slug: data.slug,
    kind: data.kind,
    name: data.name,
    headline: data.kind === "blog" ? data.headline : null,
    description: data.description,
    accent: data.kind === "blog" ? data.accent : null,
  };
  if (data.originalSlug) {
    const [existing] = await db.select().from(categories).where(eq(categories.slug, data.originalSlug)).limit(1);
    if (!existing) return { ok: false, message: "This category no longer exists." };
    if (existing.kind !== data.kind) return { ok: false, message: "A category can't move between blog and jobs." };
    // Posts and jobs follow a renamed slug automatically (ON UPDATE CASCADE).
    await db.update(categories).set(values).where(eq(categories.slug, data.originalSlug));
  } else {
    const [{ n }] = await db.select({ n: count() }).from(categories).where(eq(categories.kind, data.kind));
    await db.insert(categories).values({ ...values, sortOrder: n });
  }
  await logAudit(user, data.originalSlug ? "updated" : "created", "category", data.slug, data.name);
  await refreshSite(data.kind, data.slug, ...(data.originalSlug && data.originalSlug !== data.slug ? [data.originalSlug] : []));
  return { ok: true, message: data.originalSlug ? "Category saved." : "Category added." };
}

export async function reorderCategories(kind: "blog" | "job", slugs: string[]): Promise<CategoryResult> {
  const user = await requireStaff();
  const order = z.array(z.string().max(80)).max(200).parse(slugs);
  const db = getDb();
  const rows = await db.select({ slug: categories.slug }).from(categories).where(eq(categories.kind, z.enum(["blog", "job"]).parse(kind))).orderBy(asc(categories.sortOrder));
  const known = new Set(rows.map((r) => r.slug));
  if (order.length !== known.size || !order.every((s) => known.has(s))) return { ok: false, message: "The list changed. Reload and try again." };
  await db.transaction(async (tx) => {
    for (const [i, slug] of order.entries()) await tx.update(categories).set({ sortOrder: i }).where(eq(categories.slug, slug));
  });
  await logAudit(user, "reordered", "category", null, `${kind} categories`);
  await refreshSite(kind, ...order);
  return { ok: true, message: "Order saved." };
}

/** Deleting is blocked while any post or job uses the category. */
export async function deleteCategory(slug: string): Promise<CategoryResult> {
  const user = await requireStaff();
  const db = getDb();
  const [cat] = await db.select().from(categories).where(eq(categories.slug, z.string().max(80).parse(slug))).limit(1);
  if (!cat) return { ok: false, message: "Already deleted." };
  const [[posts], [jobRows]] = await Promise.all([
    db.select({ n: count() }).from(articles).where(eq(articles.category, cat.slug)),
    db.select({ n: count() }).from(jobs).where(eq(jobs.category, cat.slug)),
  ]);
  const used = posts.n + jobRows.n;
  if (used > 0) {
    return { ok: false, message: `"${cat.name}" is used by ${used} ${cat.kind === "blog" ? "post" : "job"}${used === 1 ? "" : "s"}. Move them to another category first.` };
  }
  await db.delete(categories).where(eq(categories.slug, cat.slug));
  await logAudit(user, "deleted", "category", cat.slug, cat.name);
  await refreshSite(cat.kind, cat.slug);
  return { ok: true, message: "Category deleted." };
}

