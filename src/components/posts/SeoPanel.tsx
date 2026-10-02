"use client";

import { Field, Input, Switch, Textarea } from "@/components/admin/Field";
import type { PostDraft } from "@/lib/posts/draft";

/** SEO title/description with counters, a Google-style preview, canonical URL and noindex. */
export function SeoPanel({ draft, update, errors, siteOrigin }: { draft: PostDraft; update: (p: Partial<PostDraft>) => void; errors: Record<string, string>; siteOrigin: string }) {
  const title = draft.seoTitle || draft.title || "Post title";
  const description = draft.seoDescription || draft.excerpt || "The excerpt shows here when no SEO description is set.";
  const host = siteOrigin.replace(/^https?:\/\//, "");
  return (
    <div className="flex flex-col gap-5">
      <div>
        <p className="mb-2 text-[13px] font-medium text-muted">Google preview</p>
        <div className="rounded-xl bg-white p-4 font-[arial,sans-serif] shadow-inner">
          <p className="truncate text-xs text-[#202124]">
            {host} › blog › {draft.slug || "…"}
          </p>
          <p className="mt-1 line-clamp-1 text-[18px] leading-snug text-[#1a0dab]">{title.length > 60 ? `${title.slice(0, 60)}…` : title}</p>
          <p className="mt-1 line-clamp-2 text-[13px] leading-snug text-[#4d5156]">{description.length > 160 ? `${description.slice(0, 157)}…` : description}</p>
        </div>
      </div>
      <Field label="SEO title" htmlFor="seoTitle" hint="Optional. Defaults to the post title." error={errors.seoTitle} counter={{ value: draft.seoTitle.length, max: 70 }}>
        <Input id="seoTitle" value={draft.seoTitle} invalid={Boolean(errors.seoTitle)} onChange={(e) => update({ seoTitle: e.target.value })} />
      </Field>
      <Field label="SEO description" htmlFor="seoDescription" hint="Optional, 50–170 characters. Defaults to the excerpt." error={errors.seoDescription} counter={{ value: draft.seoDescription.length, max: 170, min: 50 }}>
        <Textarea id="seoDescription" rows={3} value={draft.seoDescription} invalid={Boolean(errors.seoDescription)} onChange={(e) => update({ seoDescription: e.target.value })} />
      </Field>
      <Field label="Canonical URL" htmlFor="canonicalUrl" hint="Only if this post was first published on another site." error={errors.canonicalUrl}>
        <Input id="canonicalUrl" type="url" value={draft.canonicalUrl} placeholder="https://" invalid={Boolean(errors.canonicalUrl)} onChange={(e) => update({ canonicalUrl: e.target.value })} />
      </Field>
      <Switch label="Hide from search engines" description="Adds noindex. Use for thin or temporary posts." checked={draft.noindex} onCheckedChange={(v) => update({ noindex: v })} />
    </div>
  );
}
