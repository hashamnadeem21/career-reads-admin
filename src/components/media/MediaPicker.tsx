"use client";

import { ImageOff, Search } from "lucide-react";
import { useEffect, useState, useTransition, type ReactNode } from "react";
import { searchMedia } from "@/app/actions/media";
import { GlassDialog } from "@/components/admin/GlassDialog";
import { controlClasses } from "@/components/admin/Field";
import { EmptyState } from "@/components/admin/EmptyState";
import type { MediaItem } from "@/lib/media/queries";
import { cn } from "@/lib/utils";
import { UploadZone } from "./UploadZone";

/** Choose an image from the library, or upload a new one. */
export function MediaPicker({ trigger, title = "Choose an image", onSelect }: { trigger: ReactNode; title?: string; onSelect: (item: MediaItem) => void }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [items, setItems] = useState<MediaItem[] | null>(null);
  const [, start] = useTransition();

  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(() => start(async () => setItems((await searchMedia(q)).items)), q ? 250 : 0);
    return () => clearTimeout(timer);
  }, [open, q]);

  const choose = (item: MediaItem) => {
    onSelect(item);
    setOpen(false);
  };

  return (
    <GlassDialog open={open} onOpenChange={setOpen} trigger={trigger} title={title} className="w-[min(94vw,880px)]">
      <div className="flex flex-col gap-4">
        <UploadZone compact multiple={false} onUploaded={(added) => added[0] && choose(added[0])} />
        <label className="relative">
          <span className="sr-only">Search the library</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden />
          <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search the library…" className={cn(controlClasses(), "h-10 pl-9")} />
        </label>
        {items === null ? (
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4" aria-hidden>
            {Array.from({ length: 8 }, (_, i) => (
              <div key={i} className="skeleton aspect-[4/3]" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <EmptyState compact icon={ImageOff} title="No images in the library yet" description="Upload one above." />
        ) : (
          <ul className="grid max-h-[46vh] grid-cols-3 gap-3 overflow-y-auto p-1 sm:grid-cols-4" aria-label="Library images">
            {items.map((item) => (
              <li key={item.id}>
                <button type="button" onClick={() => choose(item)} className="glass-inset group block w-full overflow-hidden p-1 hover:border-primary" aria-label={`Use ${item.alt || item.url.split("/").pop()}`}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={item.previewUrl} alt="" loading="lazy" className="aspect-[4/3] w-full rounded-lg object-cover" />
                  <span className="num block px-1 pt-1 text-[11px] text-muted">
                    {item.width}×{item.height}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </GlassDialog>
  );
}
