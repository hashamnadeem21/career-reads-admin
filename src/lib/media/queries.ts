import "server-only";
import { count, desc, eq, ilike, or, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { articles, authors, media, type MediaRow } from "@/db/schema";
import { siteUrl } from "@/lib/site-url";

export interface MediaItem {
  id: string;
  url: string;
  /** Absolute URL for <img> in the admin (site-relative uploads resolve to the public site). */
  previewUrl: string;
  alt: string;
  width: number;
  height: number;
  sizeBytes: number;
  createdAt: string;
}

export function toMediaItem(row: MediaRow): MediaItem {
  return {
    id: row.id,
    url: row.url,
    previewUrl: siteUrl(row.url),
    alt: row.alt,
    width: row.width,
    height: row.height,
    sizeBytes: row.sizeBytes,
    createdAt: row.createdAt.toISOString(),
  };
}

export const MEDIA_PAGE_SIZE = 48;

export async function listMedia({ q, page = 1 }: { q?: string; page?: number }) {
  const db = getDb();
  const where = q ? or(ilike(media.alt, `%${q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`), ilike(media.url, `%${q}%`)) : undefined;
  const [rows, [{ total }]] = await Promise.all([
    db.select().from(media).where(where).orderBy(desc(media.createdAt)).limit(MEDIA_PAGE_SIZE).offset((page - 1) * MEDIA_PAGE_SIZE),
    db.select({ total: count() }).from(media).where(where),
  ]);
  return { items: rows.map(toMediaItem), total, page };
}

export interface MediaUsage {
  kind: "post" | "author";
  slug: string;
  title: string;
  where: string;
  href: string;
}

/** Every post (hero, extra images or body) and author avatar that uses this image. */
export async function getMediaUsage(url: string): Promise<MediaUsage[]> {
  const db = getDb();
  const like = `%${url.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
  const [posts, people] = await Promise.all([
    db
      .select({ slug: articles.slug, title: articles.title, cover: articles.coverImage, images: articles.images, body: articles.body })
      .from(articles)
      .where(
        or(
          eq(articles.coverImage, url),
          sql`${articles.images} @> ${JSON.stringify([{ src: url }])}::jsonb`,
          ilike(articles.body, like),
        ),
      ),
    db.select({ slug: authors.slug, name: authors.name }).from(authors).where(eq(authors.avatar, url)),
  ]);
  return [
    ...posts.map((p) => ({
      kind: "post" as const,
      slug: p.slug,
      title: p.title,
      where: p.cover === url ? "Hero image" : p.images.some((i) => i.src === url) ? "In-post image" : "Post body",
      href: `/posts/${p.slug}`,
    })),
    ...people.map((a) => ({ kind: "author" as const, slug: a.slug, title: a.name, where: "Author photo", href: `/authors?edit=${a.slug}` })),
  ];
}
