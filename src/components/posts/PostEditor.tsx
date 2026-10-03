"use client";

import { Tabs } from "radix-ui";
import { AlertCircle, Eye, PenLine } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import readingTime from "reading-time";
import { toast } from "sonner";
import { deletePost, duplicatePost, savePost } from "@/app/actions/posts";
import { Button } from "@/components/admin/Button";
import { GlassPanel } from "@/components/admin/Glass";
import { articleState } from "@/lib/content-state";
import { checkDraft, type PostDraft, type PostIntent } from "@/lib/posts/draft";
import { cn, slugify, timeAgo } from "@/lib/utils";
import { DetailsPanel } from "./DetailsPanel";
import { ImagesPanel } from "./ImagesPanel";
import { MarkdownField } from "./MarkdownField";
import { PreviewPane } from "./PreviewPane";
import { PublishPanel } from "./PublishPanel";
import { SeoPanel } from "./SeoPanel";

const AUTOSAVE_MS = 30_000;
type SideTab = "details" | "images" | "seo" | "publish";

const FIELD_TAB: Record<string, SideTab> = {
  slug: "details",
  excerpt: "details",
  category: "details",
  tags: "details",
  author: "details",
  coverImage: "images",
  coverAlt: "images",
  images: "images",
  seoTitle: "seo",
  seoDescription: "seo",
  canonicalUrl: "seo",
  publishedAt: "publish",
};
const LABELS: Record<string, string> = {
  title: "Title",
  body: "Post body",
  slug: "URL slug",
  excerpt: "Excerpt",
  category: "Category",
  tags: "Tags",
  author: "Author",
  coverImage: "Hero image",
  coverAlt: "Hero alt text",
  seoTitle: "SEO title",
  seoDescription: "SEO description",
  canonicalUrl: "Canonical URL",
  publishedAt: "Schedule",
};
const backupKeyFor = (slug: string | null) => `blognest-admin:post-backup:${slug ?? "new"}`;

/** A local backup that differs from what the server has (offered for restore). */
function readBackup(initial: PostDraft): { draft: PostDraft; at: string } | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(backupKeyFor(initial.originalSlug));
    if (!raw) return null;
    const saved = JSON.parse(raw) as { draft: PostDraft; at: string };
    return JSON.stringify(saved.draft) !== JSON.stringify(initial) ? saved : null;
  } catch {
    return null;
  }
}

const fieldLabel = (key: string) =>
  LABELS[key] ?? (key.startsWith("images.") ? `Image ${Number(key.split(".")[1]) + 1} ${key.split(".")[2] ?? ""}` : key.startsWith("tags.") ? "Tags" : key);

/**
 * Distraction-free writing panel (90% opaque) with a glass side panel:
 * Details · Images · SEO · Publish. Autosaves drafts every 30s.
 */
export function PostEditor({
  initial,
  categories,
  authors,
  siteOrigin,
}: {
  initial: PostDraft;
  categories: { slug: string; name: string }[];
  authors: { slug: string; name: string }[];
  siteOrigin: string;
}) {
  const router = useRouter();
  const [draft, setDraft] = useState<PostDraft>(() => ({ ...initial, images: initial.images.map((img, i) => ({ ...img, id: img.id ?? `image-${i}` })) }));
  const [dirty, setDirty] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<PostIntent | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [mode, setMode] = useState<"write" | "preview">("write");
  const [side, setSide] = useState<SideTab>("details");
  const [slugEdited, setSlugEdited] = useState(Boolean(initial.originalSlug));
  const [backup, setBackup] = useState<{ draft: PostDraft; at: string } | null>(() => readBackup(initial));
  const draftRef = useRef(draft);
  useEffect(() => {
    draftRef.current = draft;
  }, [draft]);
  const backupKey = backupKeyFor(initial.originalSlug);
  // The restore banner depends on this device's storage, so it only renders after hydration.
  const hydrated = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const isNew = !draft.originalSlug;

  const update = useCallback(
    (patch: Partial<PostDraft>) => {
      setDraft((d) => {
        const next = { ...d, ...patch };
        if (!slugEdited && "title" in patch) next.slug = slugify(next.title);
        return next;
      });
      setDirty(true);
    },
    [slugEdited],
  );

  const stats = useMemo(() => readingTime(draft.body), [draft.body]);
  const readingMinutes = Math.max(1, Math.round(stats.minutes));
  const missingSections = useMemo(
    () => checkDraft(draft, { status: "draft", publishedAt: new Date() }).missingSections,
    [draft],
  );
  const state = draft.publishedAt ? articleState(draft) : "draft";

  const writeBackup = useCallback(() => {
    try {
      localStorage.setItem(backupKey, JSON.stringify({ draft: draftRef.current, at: new Date().toISOString() }));
    } catch {
      /* storage unavailable or full */
    }
  }, [backupKey]);

  const clearBackup = useCallback(() => {
    try {
      localStorage.removeItem(backupKey);
      localStorage.removeItem("blognest-admin:post-backup:new");
    } catch {
      /* ignore */
    }
  }, [backupKey]);

  const save = useCallback(
    async (intent: PostIntent, scheduleAt?: string) => {
      const current = draftRef.current;
      if (intent !== "autosave") setSaving(intent);
      try {
        const result = await savePost(current, intent, scheduleAt);
        if (!result.ok) {
          if (intent === "autosave") {
            writeBackup();
            setSavedAt(null);
            return;
          }
          setErrors(result.errors ?? {});
          const first = Object.keys(result.errors ?? {})[0];
          if (first && FIELD_TAB[first.split(".")[0]]) setSide(FIELD_TAB[first.split(".")[0]]);
          if (first === "title" || first === "body") setMode("write");
          toast.error(result.message);
          return;
        }
        setErrors({});
        setDirty(JSON.stringify(draftRef.current) !== JSON.stringify(current));
        setSavedAt(result.savedAt ?? new Date().toISOString());
        clearBackup();
        const next = { ...current, originalSlug: result.slug!, status: result.status!, publishedAt: result.publishedAt! };
        setDraft((d) => ({ ...d, originalSlug: result.slug!, status: result.status!, publishedAt: result.publishedAt! }));
        draftRef.current = { ...draftRef.current, ...next };
        setSlugEdited(true);
        if (intent !== "autosave") (result.siteRefreshed === false ? toast.warning : toast.success)(result.message);
        if (current.originalSlug !== result.slug) router.replace(`/posts/${result.slug}`, { scroll: false });
        else router.refresh();
      } finally {
        setSaving(null);
      }
    },
    [clearBackup, router, writeBackup],
  );

  // Autosave every 30 seconds while there are unsaved changes.
  useEffect(() => {
    if (!dirty) return;
    const timer = setInterval(() => {
      if (draftRef.current.status === "published") writeBackup();
      else void save("autosave");
    }, AUTOSAVE_MS);
    return () => clearInterval(timer);
  }, [dirty, save, writeBackup]);

  // Warn before leaving with unsaved changes (tab close, reload, or in-app links).
  useEffect(() => {
    if (!dirty) return;
    const beforeUnload = (e: BeforeUnloadEvent) => {
      writeBackup();
      e.preventDefault();
    };
    const onClick = (e: MouseEvent) => {
      const link = (e.target as HTMLElement).closest("a[href]") as HTMLAnchorElement | null;
      if (!link || link.target === "_blank" || e.defaultPrevented || e.metaKey || e.ctrlKey) return;
      if (new URL(link.href, location.href).origin !== location.origin) return;
      if (!window.confirm("You have unsaved changes. Leave without saving?")) {
        e.preventDefault();
        e.stopPropagation();
      } else {
        writeBackup();
      }
    };
    window.addEventListener("beforeunload", beforeUnload);
    document.addEventListener("click", onClick, true);
    return () => {
      window.removeEventListener("beforeunload", beforeUnload);
      document.removeEventListener("click", onClick, true);
    };
  }, [dirty, writeBackup]);

  // ⌘S saves.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && typeof e.key === "string" && e.key.toLowerCase() === "s") {
        e.preventDefault();
        void save(draftRef.current.status === "published" ? "update" : "draft");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [save]);

  const errorEntries = Object.entries(errors);
  const categoryName = categories.find((c) => c.slug === draft.category)?.name ?? "";
  const statusText = saving
    ? "Saving…"
    : dirty
      ? draft.status === "published"
        ? "Unsaved changes (live posts aren't autosaved)"
        : "Unsaved changes · autosaves every 30s"
      : savedAt
        ? `Saved ${timeAgo(savedAt)}`
        : isNew
          ? "New post"
          : "All changes saved";

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_400px]">
      <div className="flex min-w-0 flex-col gap-4">
        {hydrated && backup && (
          <div role="status" className="glass-strong flex flex-wrap items-center gap-3 px-4 py-3 text-sm">
            <AlertCircle className="h-4 w-4 text-accent" aria-hidden />
            <span className="flex-1">Unsaved changes from {timeAgo(backup.at)} were found on this device.</span>
            <Button
              size="sm"
              variant="primary"
              onClick={() => {
                setDraft({ ...backup.draft, originalSlug: initial.originalSlug });
                setDirty(true);
                setBackup(null);
              }}
            >
              Restore
            </Button>
            <Button
              size="sm"
              onClick={() => {
                clearBackup();
                setBackup(null);
              }}
            >
              Discard
            </Button>
          </div>
        )}

        {errorEntries.length > 0 && (
          <div role="alert" className="rounded-[var(--radius-panel)] bg-danger-soft p-4 text-sm text-danger">
            <p className="font-semibold">Please fix these before saving:</p>
            <ul className="mt-2 list-disc space-y-0.5 pl-5">
              {errorEntries.slice(0, 8).map(([key, message]) => (
                <li key={key}>
                  <button
                    type="button"
                    className="underline-offset-2 hover:underline"
                    onClick={() => {
                      const tab = FIELD_TAB[key.split(".")[0]];
                      if (tab) setSide(tab);
                      else setMode("write");
                    }}
                  >
                    {fieldLabel(key)}: {message}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        <GlassPanel strong className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div role="tablist" aria-label="Editor mode" className="glass-inset inline-flex p-1">
              {(["write", "preview"] as const).map((m) => (
                <button
                  key={m}
                  role="tab"
                  type="button"
                  aria-selected={mode === m}
                  onClick={() => setMode(m)}
                  className={cn("inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold", mode === m ? "bg-primary text-primary-ink" : "text-muted hover:text-ink")}
                >
                  {m === "write" ? <PenLine className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  {m === "write" ? "Write" : "Preview"}
                </button>
              ))}
            </div>
            <p className="text-xs text-muted" aria-live="polite">
              {statusText}
            </p>
          </div>

          {mode === "write" ? (
            <>
              <div>
                <label htmlFor="title" className="sr-only">
                  Title
                </label>
                <textarea
                  id="title"
                  rows={1}
                  value={draft.title}
                  onChange={(e) => update({ title: e.target.value.replace(/\n/g, " ") })}
                  placeholder="Post title"
                  aria-invalid={Boolean(errors.title) || undefined}
                  className={cn(
                    "w-full resize-none bg-transparent text-3xl font-bold leading-tight tracking-tight outline-none [field-sizing:content] placeholder:text-faint focus-visible:shadow-none focus-visible:outline-none",
                    errors.title && "text-danger",
                  )}
                />
                <p className={cn("num mt-1 text-xs", draft.title.length > 110 ? "text-danger" : "text-faint")}>
                  {draft.title.length}/110 {errors.title && <span className="font-medium text-danger">· {errors.title}</span>}
                </p>
              </div>
              <MarkdownField value={draft.body} onChange={(body) => update({ body })} invalid={Boolean(errors.body)} describedBy={errors.body ? "body-error" : undefined} />
              {errors.body && (
                <p id="body-error" className="text-xs font-medium text-danger">
                  {errors.body}
                </p>
              )}
            </>
          ) : (
            <PreviewPane draft={draft} siteOrigin={siteOrigin} categoryName={categoryName} readingMinutes={readingMinutes} />
          )}
        </GlassPanel>
      </div>

      <GlassPanel as="aside" className="flex min-w-0 flex-col gap-4 self-start xl:sticky xl:top-5" aria-label="Post settings">
        <Tabs.Root value={side} onValueChange={(v) => setSide(v as SideTab)}>
          <Tabs.List aria-label="Post settings" className="glass-inset mb-5 grid grid-cols-4 p-1">
            {(["details", "images", "seo", "publish"] as const).map((t) => {
              const hasError = Object.keys(errors).some((k) => FIELD_TAB[k.split(".")[0]] === t);
              return (
                <Tabs.Trigger
                  key={t}
                  value={t}
                  className="relative rounded-lg px-2 py-1.5 text-[13px] font-semibold text-muted data-[state=active]:bg-primary data-[state=active]:text-primary-ink"
                >
                  {{ details: "Details", images: "Images", seo: "SEO", publish: "Publish" }[t]}
                  {hasError && <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-danger" aria-label="has errors" />}
                </Tabs.Trigger>
              );
            })}
          </Tabs.List>
          <Tabs.Content value="details">
            <DetailsPanel
              draft={draft}
              update={update}
              errors={errors}
              categories={categories}
              authors={authors}
              onSlugEdit={() => setSlugEdited(true)}
              readingMinutes={readingMinutes}
              words={stats.words}
            />
          </Tabs.Content>
          <Tabs.Content value="images">
            <ImagesPanel draft={draft} update={update} errors={errors} missingSections={missingSections} siteOrigin={siteOrigin} />
          </Tabs.Content>
          <Tabs.Content value="seo">
            <SeoPanel draft={draft} update={update} errors={errors} siteOrigin={siteOrigin} />
          </Tabs.Content>
          <Tabs.Content value="publish">
            <PublishPanel
              draft={draft}
              update={update}
              state={state}
              isNew={isNew}
              saving={saving}
              onSave={(intent, at) => void save(intent, at)}
              scheduleError={errors.publishedAt}
              siteHref={`${siteOrigin}/blog/${draft.originalSlug ?? draft.slug}`}
              onDuplicate={async () => {
                const r = await duplicatePost(draft.originalSlug!);
                if (r.ok) {
                  toast.success(r.message);
                  router.push(`/posts/${r.slug}`);
                } else toast.error(r.message);
              }}
              onDelete={async () => {
                const r = await deletePost(draft.originalSlug!);
                (r.ok ? toast.success : toast.error)(r.message);
                if (r.ok) {
                  setDirty(false);
                  clearBackup();
                  router.push("/posts");
                }
              }}
            />
          </Tabs.Content>
        </Tabs.Root>
      </GlassPanel>
    </div>
  );
}

