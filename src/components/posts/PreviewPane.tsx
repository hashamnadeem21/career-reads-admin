"use client";

import { useEffect, useState, useTransition, type ReactNode } from "react";
import { renderPostPreview } from "@/app/actions/posts";
import type { PostDraft } from "@/lib/posts/draft";

/** The real article rendering (site MDX pipeline + prose-article styles), refreshed as you type. */
export function PreviewPane({ draft, siteOrigin, categoryName, readingMinutes }: { draft: PostDraft; siteOrigin: string; categoryName: string; readingMinutes: number }) {
  const [rendered, setRendered] = useState<ReactNode>(null);
  const [pending, start] = useTransition();

  useEffect(() => {
    const timer = setTimeout(
      () => start(async () => setRendered(await renderPostPreview(draft.body, draft.images.filter((i) => i.src), draft.ads))),
      400,
    );
    return () => clearTimeout(timer);
  }, [draft.body, draft.images, draft.ads]);

  const cover = draft.coverImage ? (draft.coverImage.startsWith("/") ? `${siteOrigin}${draft.coverImage}` : draft.coverImage) : null;

  return (
    <div className="site-preview overflow-hidden rounded-[var(--radius-panel)] border border-divider" aria-busy={pending}>
      <div className="flex items-center gap-2 border-b border-[#e2e8f0] bg-[#f8fafc] px-4 py-2 text-xs text-[#475569]">
        <span className="h-2.5 w-2.5 rounded-full bg-[#fca5a5]" aria-hidden />
        <span className="h-2.5 w-2.5 rounded-full bg-[#fcd34d]" aria-hidden />
        <span className="h-2.5 w-2.5 rounded-full bg-[#86efac]" aria-hidden />
        <span className="ml-2 truncate">
          {siteOrigin.replace(/^https?:\/\//, "")}/blog/{draft.slug || "…"}
        </span>
        {pending && <span className="ml-auto">Updating…</span>}
      </div>
      <article className="mx-auto max-w-3xl px-5 py-8 sm:px-8">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#1d4ed8]">{categoryName || "Category"}</p>
        <h1 className="mt-3 text-3xl font-bold leading-tight tracking-tight sm:text-4xl">{draft.title || "Post title"}</h1>
        {draft.excerpt && <p className="mt-4 text-lg text-[#475569]">{draft.excerpt}</p>}
        <p className="mt-4 text-sm text-[#475569]">{readingMinutes} min read</p>
        {cover && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={cover} alt={draft.coverAlt} className="mt-8 aspect-[16/9] w-full rounded-2xl object-cover" />
        )}
        <div className="prose prose-lg prose-article mt-10 max-w-none prose-headings:font-semibold prose-img:rounded-2xl">{rendered ?? <div className="h-64" />}</div>
      </article>
    </div>
  );
}
