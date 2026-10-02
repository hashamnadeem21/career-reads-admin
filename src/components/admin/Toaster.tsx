"use client";

import { Toaster as Sonner } from "sonner";

/** Small glass pills, bottom-right. Use `toast("Job published", { action })` from "sonner". */
export function Toaster() {
  return (
    <Sonner
      position="bottom-right"
      closeButton
      toastOptions={{
        unstyled: true,
        classNames: {
          toast:
            "glass-strong flex w-[min(92vw,360px)] items-center gap-3 !rounded-full px-4 py-3 text-sm text-ink shadow-lg",
          title: "font-semibold",
          description: "text-muted text-xs",
          actionButton: "ml-auto rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-ink",
          closeButton: "!bg-[var(--glass-solid-fallback)] !border-[var(--glass-border)] !text-ink",
          success: "[&_[data-icon]]:text-success",
          error: "[&_[data-icon]]:text-danger",
        },
      }}
    />
  );
}
