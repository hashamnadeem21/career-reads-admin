"use client";

import { Check, Copy, ImageOff, Search, Trash2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { deleteMedia, mediaUsage, searchMedia, updateMediaAlt } from "@/app/actions/media";
import { Button } from "@/components/admin/Button";
import { EmptyState } from "@/components/admin/EmptyState";
import { Field, Input, controlClasses } from "@/components/admin/Field";
import { ConfirmDialog, GlassDrawer } from "@/components/admin/GlassDialog";
import type { MediaItem, MediaUsage } from "@/lib/media/queries";
import { cn, formatDate } from "@/lib/utils";
import { UploadZone } from "./UploadZone";

function kb(bytes: number) {
  return bytes > 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.round(bytes / 1024)} KB`;
}

function Details({ item, onChange, onDeleted }: { item: MediaItem; onChange: (i: MediaItem) => void; onDeleted: () => void }) {
  const [alt, setAlt] = useState(item.alt);
  const [usage, setUsage] = useState<MediaUsage[] | null>(null);
  const [pending, start] = useTransition();
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let live = true;
    mediaUsage(item.url).then((u) => live && setUsage(u));
    return () => {
      live = false;
    };
  }, [item.url]);

  return (
    <div className="flex flex-col gap-5">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={item.previewUrl} alt={item.alt} className="w-full rounded-xl bg-inset object-contain" style={{ aspectRatio: `${item.width} / ${item.height}` }} />
      <dl className="grid grid-cols-2 gap-2 text-xs">
        <dt className="text-muted">Size</dt>
        <dd className="num text-right">
          {item.width} × {item.height} · {kb(item.sizeBytes)}
        </dd>
        <dt className="text-muted">Uploaded</dt>
        <dd className="text-right">{formatDate(item.createdAt)}</dd>
      </dl>
      <Field label="Alt text" htmlFor="media-alt" hint="Describe the image for people who can't see it. Posts can override it.">
        <Input id="media-alt" value={alt} maxLength={200} onChange={(e) => setAlt(e.target.value)} />
      </Field>
      <div className="flex gap-2">
        <Button
          variant="primary"
          size="sm"
          disabled={pending || alt === item.alt}
          onClick={() =>
            start(async () => {
              const r = await updateMediaAlt(item.id, alt);
              (r.ok ? toast.success : toast.error)(r.message);
              if (r.ok) onChange({ ...item, alt });
            })
          }
        >
          Save alt text
        </Button>
        <Button
          size="sm"
          onClick={async () => {
            await navigator.clipboard.writeText(item.url);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
        >
          {copied ? <Check /> : <Copy />} {copied ? "Copied" : "Copy URL"}
        </Button>
      </div>
      <section>
        <h3 className="mb-2 text-[13px] font-medium text-muted">Used in</h3>
        {usage === null ? (
          <div className="skeleton h-10" aria-hidden />
        ) : usage.length === 0 ? (
          <p className="text-sm text-muted">Not used anywhere yet.</p>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {usage.map((u) => (
              <li key={`${u.kind}-${u.slug}-${u.where}`}>
                <Link href={u.href} className="glass-inset flex items-center justify-between gap-3 px-3 py-2 text-sm hover:bg-hover">
                  <span className="truncate font-medium">{u.title}</span>
                  <span className="shrink-0 text-xs text-muted">{u.where}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
      <ConfirmDialog
        trigger={
          <Button variant="danger" size="sm" disabled={!usage || usage.length > 0} title={usage?.length ? "Used in posts: replace it there first" : undefined}>
            <Trash2 /> Delete image
          </Button>
        }
        title="Delete this image?"
        description="It will be removed from the library and storage. This can't be undone."
        onConfirm={async () => {
          const r = await deleteMedia(item.id);
          (r.ok ? toast.success : toast.error)(r.message);
          if (r.ok) onDeleted();
        }}
      />
      {usage && usage.length > 0 && <p className="-mt-3 text-xs text-muted">Images in use can&apos;t be deleted.</p>}
    </div>
  );
}

/** Masonry grid of glass tiles with an upload zone and a details drawer. */
export function MediaLibrary({ initial, total: initialTotal, openUpload }: { initial: MediaItem[]; total: number; openUpload?: boolean }) {
  const [items, setItems] = useState(initial);
  const [total, setTotal] = useState(initialTotal);
  const [q, setQ] = useState("");
  const [active, setActive] = useState<MediaItem | null>(null);
  const [page, setPage] = useState(1);
  const [, start] = useTransition();

  useEffect(() => {
    const timer = setTimeout(
      () =>
        start(async () => {
          const r = await searchMedia(q, 1);
          setItems(r.items);
          setTotal(r.total);
          setPage(1);
        }),
      q ? 250 : 0,
    );
    return () => clearTimeout(timer);
  }, [q]);

  return (
    <div className="flex flex-col gap-5">
      <UploadZone autoFocus={openUpload} onUploaded={(added) => (setItems((cur) => [...added, ...cur]), setTotal((t) => t + added.length))} />
      <label className="relative">
        <span className="sr-only">Search images</span>
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden />
        <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by alt text or file name…" className={cn(controlClasses(), "h-10 pl-9")} />
      </label>
      {items.length === 0 ? (
        <EmptyState icon={ImageOff} title={q ? "No images match" : "No images yet"} description={q ? undefined : "Upload images once and reuse them in any post."} />
      ) : (
        <ul className="columns-2 gap-4 sm:columns-3 xl:columns-4 2xl:columns-5" aria-label="Images">
          {items.map((item) => (
            <li key={item.id} className="mb-4 break-inside-avoid">
              <button
                type="button"
                onClick={() => setActive(item)}
                className="glass-inset lift group block w-full overflow-hidden p-1.5 text-left"
                aria-label={`Open ${item.alt || item.url.split("/").pop()}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={item.previewUrl} alt="" loading="lazy" className="w-full rounded-[10px] bg-inset" style={{ aspectRatio: `${item.width} / ${item.height}` }} />
                <span className="block truncate px-1.5 pb-1 pt-2 text-xs text-muted">{item.alt || <em>No alt text</em>}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {items.length < total && (
        <Button
          className="self-center"
          onClick={() =>
            start(async () => {
              const r = await searchMedia(q, page + 1);
              setItems((cur) => [...cur, ...r.items]);
              setPage(page + 1);
            })
          }
        >
          Load more
        </Button>
      )}
      <GlassDrawer open={Boolean(active)} onOpenChange={(o) => !o && setActive(null)} title="Image details">
        {active && (
          <Details
            key={active.id}
            item={active}
            onChange={(next) => {
              setItems((cur) => cur.map((i) => (i.id === next.id ? next : i)));
              setActive(next);
            }}
            onDeleted={() => {
              setItems((cur) => cur.filter((i) => i.id !== active.id));
              setTotal((t) => t - 1);
              setActive(null);
            }}
          />
        )}
      </GlassDrawer>
    </div>
  );
}
