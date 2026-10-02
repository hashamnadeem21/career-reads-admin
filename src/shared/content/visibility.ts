// Copied from blognest/src/lib/content/visibility.ts by scripts/sync-shared.mjs. Do not edit here: change the site, then re-run `npm run sync:shared`.
import type { Article, ArticleSummary } from "./schema";

/**
 * The ONLY rule that decides whether an article may be served publicly.
 * Drafts and future-dated (scheduled) articles are never visible.
 */
export function isPubliclyVisible(article: Pick<Article, "status" | "publishedAt">, now: Date = new Date()): boolean {
  return article.status === "published" && new Date(article.publishedAt).getTime() <= now.getTime();
}

/** Drops the heavy MDX body so lists don't serialize full articles. */
export function toSummary(article: Article): ArticleSummary {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { content, toc, ...summary } = article;
  return summary;
}
