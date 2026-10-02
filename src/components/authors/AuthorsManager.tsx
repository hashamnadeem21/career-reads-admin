"use client";

import { ImagePlus, Pencil, Plus, Trash2, UserRound } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { deleteAuthor, saveAuthor, type AuthorInput } from "@/app/actions/authors";
import { Avatar } from "@/components/admin/Avatar";
import { Badge } from "@/components/admin/Badge";
import { Button } from "@/components/admin/Button";
import { EmptyState } from "@/components/admin/EmptyState";
import { Field, Input, Select, Textarea } from "@/components/admin/Field";
import { ConfirmDialog, GlassDrawer } from "@/components/admin/GlassDialog";
import { MediaPicker } from "@/components/media/MediaPicker";
import { slugify } from "@/lib/utils";

export interface AuthorItem extends AuthorInput {
  avatarUrl: string;
  posts: number;
}

const blankAuthor = (): AuthorItem => ({
  originalSlug: null,
  slug: "",
  name: "",
  type: "Person",
  role: "",
  bio: "",
  avatar: "",
  avatarUrl: "",
  links: { website: "", x: "", linkedin: "" },
  posts: 0,
});

function AuthorForm({ initial, onDone, siteOrigin }: { initial: AuthorItem; onDone: () => void; siteOrigin: string }) {
  const [v, setV] = useState(initial);
  const [slugEdited, setSlugEdited] = useState(Boolean(initial.originalSlug));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, start] = useTransition();
  const set = (patch: Partial<AuthorItem>) =>
    setV((cur) => {
      const next = { ...cur, ...patch };
      if (!slugEdited && "name" in patch) next.slug = slugify(next.name);
      return next;
    });
  const link = (key: keyof AuthorItem["links"], label: string) => (
    <Field label={label} htmlFor={`author-${key}`} error={errors[`links.${key}`]}>
      <Input id={`author-${key}`} type="url" placeholder="https://" value={v.links[key]} onChange={(e) => set({ links: { ...v.links, [key]: e.target.value } })} />
    </Field>
  );

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { avatarUrl, posts, ...input } = v;
          const r = await saveAuthor(input);
          setErrors(r.errors ?? {});
          (r.ok ? toast.success : toast.error)(r.message);
          if (r.ok) onDone();
        });
      }}
    >
      <div className="flex items-center gap-4">
        <Avatar name={v.name || "New author"} src={v.avatarUrl || null} size={64} />
        <div className="flex flex-col gap-1">
          <MediaPicker
            title="Choose a photo or logo"
            onSelect={(m) => set({ avatar: m.url, avatarUrl: m.previewUrl })}
            trigger={
              <Button size="sm" variant={errors.avatar ? "danger" : "secondary"}>
                <ImagePlus /> {v.avatar ? "Change photo" : "Choose photo"}
              </Button>
            }
          />
          {errors.avatar && <p className="text-xs font-medium text-danger">{errors.avatar}</p>}
        </div>
      </div>
      <Field label="Name" htmlFor="author-name" required error={errors.name}>
        <Input id="author-name" value={v.name} onChange={(e) => set({ name: e.target.value })} invalid={Boolean(errors.name)} />
      </Field>
      <Field label="Slug" htmlFor="author-slug" error={errors.slug} hint={`${siteOrigin.replace(/^https?:\/\//, "")}/authors/${v.slug || "…"}`}>
        <Input
          id="author-slug"
          value={v.slug}
          invalid={Boolean(errors.slug)}
          onChange={(e) => {
            setSlugEdited(true);
            set({ slug: e.target.value.toLowerCase() });
          }}
        />
      </Field>
      <Field label="Type" htmlFor="author-type">
        <Select id="author-type" value={v.type} onChange={(e) => set({ type: e.target.value as AuthorItem["type"] })}>
          <option value="Person">Person</option>
          <option value="Organization">Team / organization</option>
        </Select>
      </Field>
      <Field label="Role" htmlFor="author-role" required error={errors.role} hint='e.g. "Senior editor"'>
        <Input id="author-role" value={v.role} onChange={(e) => set({ role: e.target.value })} invalid={Boolean(errors.role)} />
      </Field>
      <Field label="Bio" htmlFor="author-bio" required error={errors.bio} counter={{ value: v.bio.length, max: 600, min: 40 }}>
        <Textarea id="author-bio" rows={5} value={v.bio} onChange={(e) => set({ bio: e.target.value })} invalid={Boolean(errors.bio)} />
      </Field>
      {link("website", "Website")}
      {link("x", "X (Twitter)")}
      {link("linkedin", "LinkedIn")}
      <Button type="submit" variant="primary" disabled={pending}>
        {pending ? "Saving…" : initial.originalSlug ? "Save changes" : "Add author"}
      </Button>
    </form>
  );
}

export function AuthorsManager({ authors, siteOrigin }: { authors: AuthorItem[]; siteOrigin: string }) {
  const router = useRouter();
  const params = useSearchParams();
  const [editing, setEditing] = useState<AuthorItem | null>(() =>
    params.get("new") === "1" ? blankAuthor() : (authors.find((a) => a.slug === params.get("edit")) ?? null),
  );

  return (
    <>
      <div className="mb-5 flex justify-end">
        <Button variant="primary" onClick={() => setEditing(blankAuthor())}>
          <Plus /> Add author
        </Button>
      </div>
      {authors.length === 0 ? (
        <EmptyState icon={UserRound} title="No authors yet" description="Add the people (or team) who write your posts." />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {authors.map((a, i) => (
            <li key={a.slug} className="glass lift rise-in flex flex-col gap-3 p-5" style={{ "--stagger": i } as React.CSSProperties}>
              <div className="flex items-center gap-3">
                <Avatar name={a.name} src={a.avatarUrl} size={48} />
                <div className="min-w-0">
                  <p className="truncate font-semibold">{a.name}</p>
                  <p className="truncate text-xs text-muted">{a.role}</p>
                </div>
              </div>
              <p className="line-clamp-3 text-sm text-muted">{a.bio}</p>
              <div className="mt-auto flex items-center gap-2">
                <Badge tone={a.type === "Organization" ? "info" : "neutral"}>{a.type === "Organization" ? "Team" : "Person"}</Badge>
                <span className="num text-xs text-muted">
                  {a.posts} post{a.posts === 1 ? "" : "s"}
                </span>
                <Button size="icon-sm" variant="ghost" className="ml-auto" onClick={() => setEditing(a)} aria-label={`Edit ${a.name}`}>
                  <Pencil />
                </Button>
                <ConfirmDialog
                  trigger={
                    <Button size="icon-sm" variant="ghost" aria-label={`Delete ${a.name}`} disabled={a.posts > 0} title={a.posts > 0 ? "Has posts: reassign them first" : undefined}>
                      <Trash2 />
                    </Button>
                  }
                  title={`Delete ${a.name}?`}
                  description="Their author page will be removed from the site."
                  onConfirm={async () => {
                    const r = await deleteAuthor(a.slug);
                    (r.ok ? toast.success : toast.error)(r.message);
                    router.refresh();
                  }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
      <GlassDrawer open={Boolean(editing)} onOpenChange={(o) => !o && setEditing(null)} title={editing?.originalSlug ? `Edit ${editing.name}` : "New author"}>
        {editing && (
          <AuthorForm
            key={editing.originalSlug ?? "new"}
            initial={editing}
            siteOrigin={siteOrigin}
            onDone={() => {
              setEditing(null);
              router.refresh();
            }}
          />
        )}
      </GlassDrawer>
    </>
  );
}
