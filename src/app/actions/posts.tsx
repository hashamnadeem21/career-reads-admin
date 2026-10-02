"use server";

import { and, eq, inArray, like } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import type { ReactNode } from "react";
import { z } from "zod";
import { ArticleBody } from "@/components/preview/ArticleBody";
import { getDb } from "@/db";
import { articles, authors, categories, dailyStats } from "@/db/schema";
import { logAudit } from "@/lib/audit";
import { requireUser } from "@/lib/auth/require-user";
import { checkDraft, postDraftSchema, resolvePublishing, type PostDraft, type PostIntent } from "@/lib/posts/draft";
import { checkMdxBody } from "@/lib/posts/mdx-check";
import { revalidateSite } from "@/lib/revalidate-site";
import { imagePlacementSchema, SLUG_PATTERN } from "@/shared/content/schema";

export interface SavePostResult {
  ok: boolean;
  slug?: string;
  status?: "draft" | "published";
  publishedAt?: string;
  savedAt?: string;
  errors?: Record<string, string>;
  message: string;
  /** False when the public site couldn't be told to refresh. */
  siteRefreshed?: boolean;
}

/** Every page on the public site that can show this post. */
async function refreshSite(post: { slug: string; category: string; author: string }, extraSlugs: string[] = []) {
  const result = await revalidateSite({
    tags: ["articles"],
    paths: [
      "/",
      "/blog",
      "/latest",
      "/trending",
      "/rss.xml",
      "/sitemap.xml",
      `/category/${post.category}`,
      `/authors/${post.author}`,
      `/blog/${post.slug}`,
      ...extraSlugs.map((s) => `/blog/${s}`),
    ],
  });
  revalidatePath("/", "layout");
  return result.ok;
}

const intentSchema = z.enum(["draft", "publish", "schedule", "update", "unpublish", "autosave"]);

export async function savePost(input: PostDraft, intentInput: PostIntent, scheduleAt?: string): Promise<SavePostResult> {
  const user = await requireUser();
  const draft = postDraftSchema.parse(input);
  const intent = intentSchema.parse(intentInput);
  const db = getDb();

  const existing = draft.originalSlug
    ? (await db.select().from(articles).where(eq(articles.slug, draft.originalSlug)).limit(1))[0]
    : undefined;
  if (draft.originalSlug && !existing) return { ok: false, message: "This post no longer exists. It may have been deleted." };
  // Autosave never changes what visitors see: it only works on drafts.
  if (intent === "autosave" && existing?.status === "published") {
    return { ok: false, message: "Published posts aren't autosaved. Use Update to publish your changes." };
  }

  const publishing = resolvePublishing({ status: existing?.status ?? "draft", publishedAt: existing?.publishedAt.toISOString() ?? "" }, intent, new Date(), scheduleAt);
  if ("error" in publishing) return { ok: false, errors: { publishedAt: publishing.error! }, message: publishing.error! };

  const check = checkDraft(draft, publishing);
  const errors = { ...check.errors };

  const [category, author, taken] = await Promise.all([
    db.select().from(categories).where(and(eq(categories.slug, draft.category), eq(categories.kind, "blog"))).limit(1),
    db.select().from(authors).where(eq(authors.slug, draft.author)).limit(1),
    draft.slug !== draft.originalSlug ? db.select({ slug: articles.slug }).from(articles).where(eq(articles.slug, draft.slug)).limit(1) : Promise.resolve([]),
  ]);
  if (!errors.body) {
    const mdxProblem = await checkMdxBody(draft.body);
    if (mdxProblem) errors.body = mdxProblem;
  }
  if (!category.length) errors.category ??= "Pick a category";
  if (!author.length) errors.author ??= "Pick an author";
  if (taken.length) errors.slug = "Another post already uses this slug";

  if (!check.data || Object.keys(errors).length) {
    return { ok: false, errors, message: intent === "autosave" ? "Not autosaved yet: some required fields are empty." : "Please fix the highlighted fields." };
  }

  const fm = check.data;
  const now = new Date();
  const row = {
    slug: draft.slug,
    title: fm.title,
    excerpt: fm.excerpt,
    body: draft.body,
    category: fm.category,
    tags: fm.tags,
    author: fm.author,
    status: fm.status,
    publishedAt: new Date(fm.publishedAt),
    // A visible "Updated" date only when a live post is edited.
    updatedAt: existing?.status === "published" && intent === "update" ? now : (existing?.updatedAt ?? null),
    featured: fm.featured,
    trending: fm.trending,
    editorsPick: fm.editorsPick,
    coverImage: fm.coverImage,
    coverAlt: fm.coverAlt,
    coverWidth: fm.coverWidth,
    coverHeight: fm.coverHeight,
    images: fm.images.map((i) => ({ ...i, caption: i.caption ?? undefined })),
    seoTitle: fm.seoTitle ?? null,
    seoDescription: fm.seoDescription ?? null,
    canonicalUrl: fm.canonicalUrl ?? null,
    noindex: fm.noindex,
    ads: fm.ads,
    savedAt: now,
  };

  if (existing) {
    await db.transaction(async (tx) => {
      await tx.update(articles).set(row).where(eq(articles.slug, existing.slug));
      if (existing.slug !== draft.slug) {
        await tx.update(dailyStats).set({ entitySlug: draft.slug, path: `/blog/${draft.slug}` }).where(eq(dailyStats.path, `/blog/${existing.slug}`));
      }
    });
  } else {
    await db.insert(articles).values({ ...row, createdBy: user.id });
  }

  const wasLive = existing?.status === "published";
  const isLive = row.status === "published";
  const action =
    intent === "autosave" ? null : intent === "schedule" ? "scheduled" : isLive && !wasLive ? "published" : !isLive && wasLive ? "unpublished" : existing ? "updated" : "created";
  if (action) await logAudit(user, action, "post", draft.slug, fm.title);

  // Drafts never appear on the site, so only refresh when something visible changed.
  const affectsSite = isLive || wasLive;
  const siteRefreshed = affectsSite ? await refreshSite(row, existing && existing.slug !== draft.slug ? [existing.slug] : []) : true;

  const messages: Record<PostIntent, string> = {
    autosave: "Draft autosaved",
    draft: "Draft saved",
    publish: "Published",
    schedule: `Scheduled for ${row.publishedAt.toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" })} UTC`,
    update: "Changes published",
    unpublish: "Unpublished. It's a draft again.",
  };
  return {
    ok: true,
    slug: draft.slug,
    status: row.status,
    publishedAt: row.publishedAt.toISOString(),
    savedAt: now.toISOString(),
    message: siteRefreshed ? messages[intent] : `${messages[intent]}. The site couldn't be refreshed right now; it will update within the hour.`,
    siteRefreshed,
  };
}

/** Preview accepts work-in-progress images (alt text may still be short); unknown keys are dropped. */
const previewImages = z
  .array(
    z.object({
      src: z.string().regex(/^\/|^https:\/\//).max(500),
      alt: z.string().max(500).default(""),
      caption: z.string().max(500).optional(),
      width: z.number().int().positive().max(20000).default(1600),
      height: z.number().int().positive().max(20000).default(900),
      placement: imagePlacementSchema.default("middle"),
    }),
  )
  .max(3);

/** Renders the post body through the same MDX pipeline the site uses. */
export async function renderPostPreview(body: string, images: unknown, ads: boolean): Promise<ReactNode> {
  await requireUser();
  const source = z.string().max(200_000).parse(body);
  const parsedImages = previewImages.safeParse(images);
  const safeImages = parsedImages.success ? parsedImages.data.map((i) => ({ ...i, caption: i.caption || undefined })) : [];
  return <ArticleBody source={source} adsEnabled={ads} images={safeImages} />;
}

const slugSchema = z.string().regex(SLUG_PATTERN).max(100);

export async function deletePost(slug: string): Promise<{ ok: boolean; message: string }> {
  const user = await requireUser();
  const [post] = await getDb().select().from(articles).where(eq(articles.slug, slugSchema.parse(slug))).limit(1);
  if (!post) return { ok: false, message: "Already deleted." };
  await getDb().transaction(async (tx) => {
    await tx.delete(articles).where(eq(articles.slug, post.slug));
    await tx.delete(dailyStats).where(eq(dailyStats.path, `/blog/${post.slug}`));
  });
  await logAudit(user, "deleted", "post", post.slug, post.title);
  if (post.status === "published") await refreshSite(post);
  return { ok: true, message: "Post deleted." };
}

export async function duplicatePost(slug: string): Promise<{ ok: boolean; slug?: string; message: string }> {
  const user = await requireUser();
  const db = getDb();
  const [post] = await db.select().from(articles).where(eq(articles.slug, slugSchema.parse(slug))).limit(1);
  if (!post) return { ok: false, message: "Post not found." };
  const base = `${post.slug.slice(0, 90)}-copy`;
  const taken = new Set((await db.select({ slug: articles.slug }).from(articles).where(like(articles.slug, `${base}%`))).map((r) => r.slug));
  let newSlug = base;
  for (let n = 2; taken.has(newSlug); n++) newSlug = `${base}-${n}`;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { slug: _s, createdAt, createdBy, savedAt, updatedAt, ...rest } = post;
  await db.insert(articles).values({
    ...rest,
    slug: newSlug,
    title: `${post.title} (copy)`.slice(0, 110),
    status: "draft",
    featured: false,
    trending: false,
    editorsPick: false,
    publishedAt: new Date(),
    createdBy: user.id,
  });
  await logAudit(user, "duplicated", "post", newSlug, post.title);
  return { ok: true, slug: newSlug, message: "Copied as a new draft." };
}

const bulkSchema = z.object({ action: z.enum(["publish", "unpublish", "delete"]), slugs: z.array(slugSchema).min(1).max(100) });

export async function bulkPosts(input: { action: string; slugs: string[] }): Promise<{ ok: boolean; message: string }> {
  const user = await requireUser();
  const { action, slugs } = bulkSchema.parse(input);
  const db = getDb();
  const rows = await db.select().from(articles).where(inArray(articles.slug, slugs));
  if (!rows.length) return { ok: false, message: "Nothing to update." };
  const found = rows.map((r) => r.slug);
  if (action === "delete") {
    await db.transaction(async (tx) => {
      await tx.delete(articles).where(inArray(articles.slug, found));
      await tx.delete(dailyStats).where(inArray(dailyStats.path, found.map((s) => `/blog/${s}`)));
    });
  } else {
    const now = new Date();
    for (const r of rows) {
      await db
        .update(articles)
        .set({ status: action === "publish" ? "published" : "draft", publishedAt: action === "publish" && r.status === "draft" ? now : r.publishedAt, savedAt: now })
        .where(eq(articles.slug, r.slug));
    }
  }
  const verb = action === "delete" ? "deleted" : action === "publish" ? "published" : "unpublished";
  for (const r of rows) await logAudit(user, verb, "post", r.slug, r.title);
  await revalidateSite({
    tags: ["articles"],
    paths: ["/", "/blog", "/latest", "/trending", "/rss.xml", "/sitemap.xml", ...rows.flatMap((r) => [`/blog/${r.slug}`, `/category/${r.category}`])],
  });
  revalidatePath("/", "layout");
  return { ok: true, message: `${rows.length} post${rows.length === 1 ? "" : "s"} ${verb}.` };
}
