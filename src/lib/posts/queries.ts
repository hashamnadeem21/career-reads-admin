import "server-only";
import { and, asc, count, eq, ilike, or, sql, type SQL } from "drizzle-orm";
import { getDb } from "@/db";
import { articles, authors, categories, type ArticleRow } from "@/db/schema";

export const POST_STATUS_FILTERS = ["live", "draft", "scheduled"] as const;
export type PostStatusFilter = (typeof POST_STATUS_FILTERS)[number];

export function postStatusCondition(status: PostStatusFilter): SQL {
  if (status === "draft") return eq(articles.status, "draft");
  if (status === "scheduled") return sql`(${articles.status} = 'published' and ${articles.publishedAt} > now())`;
  return sql`(${articles.status} = 'published' and ${articles.publishedAt} <= now())`;
}

const SORTS = { published: articles.publishedAt, title: articles.title, updated: articles.savedAt } as const;
export const POST_PAGE_SIZE = 20;

export interface PostListParams {
  q?: string;
  status?: PostStatusFilter;
  category?: string;
  page: number;
  sort: keyof typeof SORTS;
  dir: "asc" | "desc";
}

export function parsePostListParams(sp: Record<string, string | string[] | undefined>): PostListParams {
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)?.trim() || undefined;
  const status = one(sp.status);
  const sort = one(sp.sort);
  const page = Number.parseInt(one(sp.page) ?? "1", 10);
  return {
    q: one(sp.q)?.slice(0, 100),
    status: (POST_STATUS_FILTERS as readonly string[]).includes(status ?? "") ? (status as PostStatusFilter) : undefined,
    category: one(sp.category)?.slice(0, 80),
    page: Number.isFinite(page) && page > 0 ? page : 1,
    sort: sort && sort in SORTS ? (sort as keyof typeof SORTS) : "updated",
    dir: one(sp.dir) === "asc" ? "asc" : "desc",
  };
}

export async function listPosts(params: PostListParams) {
  const db = getDb();
  const where: SQL[] = [];
  if (params.q) {
    const p = `%${params.q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
    where.push(or(ilike(articles.title, p), ilike(articles.slug, p), sql`array_to_string(${articles.tags}, ' ') ilike ${p}`)!);
  }
  if (params.status) where.push(postStatusCondition(params.status));
  if (params.category) where.push(eq(articles.category, params.category));
  const condition = where.length ? and(...where) : undefined;
  const column = SORTS[params.sort];
  const [rows, [{ total }]] = await Promise.all([
    db
      .select({
        slug: articles.slug,
        title: articles.title,
        category: articles.category,
        categoryName: categories.name,
        coverImage: articles.coverImage,
        status: articles.status,
        publishedAt: articles.publishedAt,
        savedAt: articles.savedAt,
        featured: articles.featured,
        authorName: authors.name,
      })
      .from(articles)
      .leftJoin(categories, eq(categories.slug, articles.category))
      .leftJoin(authors, eq(authors.slug, articles.author))
      .where(condition)
      .orderBy(params.dir === "asc" ? sql`${column} asc` : sql`${column} desc`, asc(articles.slug))
      .limit(POST_PAGE_SIZE)
      .offset((params.page - 1) * POST_PAGE_SIZE),
    db.select({ total: count() }).from(articles).where(condition),
  ]);
  return { rows, total, page: params.page, pageSize: POST_PAGE_SIZE };
}

export async function postStatusCounts() {
  const [row] = await getDb()
    .select({
      all: count(),
      live: sql<number>`count(*) filter (where ${postStatusCondition("live")})`.mapWith(Number),
      draft: sql<number>`count(*) filter (where ${postStatusCondition("draft")})`.mapWith(Number),
      scheduled: sql<number>`count(*) filter (where ${postStatusCondition("scheduled")})`.mapWith(Number),
    })
    .from(articles);
  return row;
}

export async function getPost(slug: string): Promise<ArticleRow | null> {
  const [row] = await getDb().select().from(articles).where(eq(articles.slug, slug)).limit(1);
  return row ?? null;
}

export async function getEditorOptions() {
  const db = getDb();
  const [cats, people] = await Promise.all([
    db.select({ slug: categories.slug, name: categories.name }).from(categories).where(eq(categories.kind, "blog")).orderBy(asc(categories.sortOrder), asc(categories.name)),
    db.select({ slug: authors.slug, name: authors.name }).from(authors).orderBy(asc(authors.name)),
  ]);
  return { categories: cats, authors: people };
}
