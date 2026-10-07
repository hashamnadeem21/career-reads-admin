import "server-only";
import { apiFetch, apiGetOrNull } from "@/lib/api/client";
import type { ArticleRow, ContentStatus } from "@/lib/api/types";

export const POST_STATUS_FILTERS = ["live", "draft", "scheduled"] as const;
export type PostStatusFilter = (typeof POST_STATUS_FILTERS)[number];

const SORTS = { published: true, title: true, updated: true } as const;
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

export interface PostListRow {
  slug: string;
  title: string;
  category: string;
  categoryName: string | null;
  coverImage: string;
  status: ContentStatus;
  publishedAt: Date;
  savedAt: Date;
  featured: boolean;
  authorName: string | null;
}

export interface PostStatusCounts {
  all: number;
  live: number;
  draft: number;
  scheduled: number;
}

/** One page of posts plus the status tab counts. */
export function listPosts(params: PostListParams) {
  return apiFetch<{ rows: PostListRow[]; total: number; page: number; pageSize: number; counts: PostStatusCounts }>(
    "/posts",
    { query: { ...params }, dates: true },
  );
}

export function getPost(slug: string): Promise<ArticleRow | null> {
  return apiGetOrNull<ArticleRow>(`/posts/${encodeURIComponent(slug)}`, { dates: true });
}

export function getEditorOptions(): Promise<{
  categories: { slug: string; name: string }[];
  authors: { slug: string; name: string }[];
}> {
  return apiFetch("/posts/options");
}
