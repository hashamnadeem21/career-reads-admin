"use server";

import { count, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getDb } from "@/db";
import { articles, authors } from "@/db/schema";
import { logAudit } from "@/lib/audit";
import { requireUser } from "@/lib/auth/require-user";
import { revalidateSite } from "@/lib/revalidate-site";
import { authorSchema } from "@/shared/content/schema";

export interface AuthorInput {
  originalSlug: string | null;
  slug: string;
  name: string;
  type: "Person" | "Organization";
  role: string;
  bio: string;
  avatar: string;
  links: { website: string; x: string; linkedin: string };
}

export interface AuthorResult {
  ok: boolean;
  message: string;
  errors?: Record<string, string>;
}

async function refreshSite(...slugs: string[]) {
  await revalidateSite({ tags: ["authors", "articles"], paths: ["/", "/about", "/blog", "/sitemap.xml", ...slugs.map((s) => `/authors/${s}`)] });
  revalidatePath("/authors");
}

/** Validated with the site's own authorSchema. */
export async function saveAuthor(input: AuthorInput): Promise<AuthorResult> {
  const user = await requireUser();
  const blank = (v: string) => (v.trim() ? v.trim() : undefined);
  const parsed = authorSchema.safeParse({
    slug: input.slug,
    name: input.name,
    type: input.type,
    role: input.role,
    bio: input.bio,
    avatar: input.avatar,
    links: { website: blank(input.links.website), x: blank(input.links.x), linkedin: blank(input.links.linkedin) },
  });
  if (!parsed.success) {
    return {
      ok: false,
      message: "Please fix the highlighted fields.",
      errors: Object.fromEntries(parsed.error.issues.map((i) => [i.path.join("."), i.path[0] === "avatar" ? "Choose a photo or logo" : i.message])),
    };
  }
  const data = parsed.data;
  const db = getDb();
  const original = z.string().max(80).nullable().parse(input.originalSlug);
  if (data.slug !== original) {
    const [taken] = await db.select({ slug: authors.slug }).from(authors).where(eq(authors.slug, data.slug)).limit(1);
    if (taken) return { ok: false, message: "That slug is taken.", errors: { slug: "Another author already uses this slug" } };
  }
  const links = Object.fromEntries(Object.entries(data.links).filter(([, v]) => v));
  if (original) {
    const [existing] = await db.select().from(authors).where(eq(authors.slug, original)).limit(1);
    if (!existing) return { ok: false, message: "This author no longer exists." };
    await db.update(authors).set({ ...data, links }).where(eq(authors.slug, original)); // posts follow via ON UPDATE CASCADE
  } else {
    await db.insert(authors).values({ ...data, links });
  }
  await logAudit(user, original ? "updated" : "created", "author", data.slug, data.name);
  await refreshSite(data.slug, ...(original && original !== data.slug ? [original] : []));
  return { ok: true, message: original ? "Author saved." : "Author added." };
}

export async function deleteAuthor(slug: string): Promise<AuthorResult> {
  const user = await requireUser();
  const db = getDb();
  const [author] = await db.select().from(authors).where(eq(authors.slug, z.string().max(80).parse(slug))).limit(1);
  if (!author) return { ok: false, message: "Already deleted." };
  const [{ n }] = await db.select({ n: count() }).from(articles).where(eq(articles.author, author.slug));
  if (n > 0) return { ok: false, message: `${author.name} is the author of ${n} post${n === 1 ? "" : "s"}. Reassign them first.` };
  await db.delete(authors).where(eq(authors.slug, author.slug));
  await logAudit(user, "deleted", "author", author.slug, author.name);
  await refreshSite(author.slug);
  return { ok: true, message: "Author deleted." };
}
