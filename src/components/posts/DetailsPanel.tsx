"use client";

import { Field, Input, Select, Switch, Textarea } from "@/components/admin/Field";
import { TagInput } from "@/components/admin/TagInput";
import type { PostDraft } from "@/lib/posts/draft";

export function DetailsPanel({
  draft,
  update,
  errors,
  categories,
  authors,
  onSlugEdit,
  readingMinutes,
  words,
}: {
  draft: PostDraft;
  update: (p: Partial<PostDraft>) => void;
  errors: Record<string, string>;
  categories: { slug: string; name: string }[];
  authors: { slug: string; name: string }[];
  onSlugEdit: () => void;
  readingMinutes: number;
  words: number;
}) {
  return (
    <div className="flex flex-col gap-4">
      <p className="glass-inset num px-3 py-2 text-xs text-muted">
        {words.toLocaleString()} words · about {readingMinutes} min read
      </p>
      <Field label="URL slug" htmlFor="slug" error={errors.slug} hint={`/blog/${draft.slug || "…"}`}>
        <Input
          id="slug"
          value={draft.slug}
          invalid={Boolean(errors.slug)}
          onChange={(e) => {
            onSlugEdit();
            update({ slug: e.target.value.toLowerCase() });
          }}
        />
      </Field>
      <Field label="Excerpt" htmlFor="excerpt" required error={errors.excerpt} hint="Shown on cards and in search results" counter={{ value: draft.excerpt.length, max: 220, min: 50 }}>
        <Textarea id="excerpt" rows={3} value={draft.excerpt} invalid={Boolean(errors.excerpt)} onChange={(e) => update({ excerpt: e.target.value })} />
      </Field>
      <Field label="Category" htmlFor="category" required error={errors.category}>
        <Select id="category" value={draft.category} invalid={Boolean(errors.category)} onChange={(e) => update({ category: e.target.value })}>
          <option value="">Choose a category…</option>
          {categories.map((c) => (
            <option key={c.slug} value={c.slug}>
              {c.name}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Tags" htmlFor="tags" required error={errors.tags ?? Object.entries(errors).find(([k]) => k.startsWith("tags."))?.[1]} hint="1–8 tags">
        <TagInput id="tags" name="tags" defaultValue={draft.tags} onChange={(tags) => update({ tags })} invalid={Boolean(errors.tags)} />
      </Field>
      <Field label="Author" htmlFor="author" required error={errors.author}>
        <Select id="author" value={draft.author} invalid={Boolean(errors.author)} onChange={(e) => update({ author: e.target.value })}>
          <option value="">Choose an author…</option>
          {authors.map((a) => (
            <option key={a.slug} value={a.slug}>
              {a.name}
            </option>
          ))}
        </Select>
      </Field>
      <div className="flex flex-col gap-3 border-t border-divider pt-4">
        <Switch label="Featured" description="Shown in the homepage hero" checked={draft.featured} onCheckedChange={(v) => update({ featured: v })} />
        <Switch label="Trending" description="Editor-curated, not traffic-based" checked={draft.trending} onCheckedChange={(v) => update({ trending: v })} />
        <Switch label="Editor's pick" checked={draft.editorsPick} onCheckedChange={(v) => update({ editorsPick: v })} />
      </div>
    </div>
  );
}
