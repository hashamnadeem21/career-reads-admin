"use client";

import { ImageUp } from "lucide-react";
import { useRef, useState, useTransition, type DragEvent } from "react";
import { toast } from "sonner";
import { uploadImages } from "@/app/actions/media";
import type { MediaItem } from "@/lib/media/queries";
import { cn } from "@/lib/utils";

const ACCEPT = "image/jpeg,image/png,image/webp,image/avif";

/** Drag-and-drop (or click) upload area with a glowing dashed border. */
export function UploadZone({ onUploaded, multiple = true, compact, autoFocus }: { onUploaded?: (items: MediaItem[]) => void; multiple?: boolean; compact?: boolean; autoFocus?: boolean }) {
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const [pending, start] = useTransition();

  const send = (files: FileList | File[]) => {
    const list = Array.from(files);
    if (!list.length) return;
    const fd = new FormData();
    for (const f of multiple ? list : list.slice(0, 1)) fd.append("files", f);
    start(async () => {
      const result = await uploadImages(fd);
      for (const e of result.errors) toast.error(`${e.name}: ${e.error}`);
      if (result.uploaded.length) {
        toast.success(`${result.uploaded.length} image${result.uploaded.length === 1 ? "" : "s"} uploaded`);
        onUploaded?.(result.uploaded);
      }
      if (input.current) input.current.value = "";
    });
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setOver(false);
    send(e.dataTransfer.files);
  };

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={onDrop}
      className={cn(
        "relative flex flex-col items-center justify-center gap-2 rounded-[var(--radius-panel)] border-2 border-dashed text-center transition",
        compact ? "p-5" : "p-8",
        over ? "border-primary bg-primary-soft shadow-[0_0_0_6px_var(--primary-glow),0_0_40px_var(--primary-glow)]" : "border-primary/40 bg-inset hover:border-primary hover:shadow-[0_0_30px_-6px_var(--primary-glow)]",
      )}
    >
      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-primary-soft text-primary" aria-hidden>
        <ImageUp className="h-5 w-5" />
      </span>
      <p className="text-sm font-semibold">{pending ? "Uploading…" : "Drop images here, or"}</p>
      <label className="cursor-pointer text-sm font-semibold text-primary underline-offset-4 hover:underline">
        browse files
        <input
          ref={input}
          type="file"
          name="files"
          accept={ACCEPT}
          multiple={multiple}
          autoFocus={autoFocus}
          disabled={pending}
          className="sr-only"
          onChange={(e) => e.target.files && send(e.target.files)}
        />
      </label>
      <p className="text-xs text-faint">JPG, PNG, WebP or AVIF · up to 5 MB each</p>
    </div>
  );
}
