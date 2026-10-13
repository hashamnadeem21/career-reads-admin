"use client";

import { Monitor, Smartphone } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

const widths = { desktop: "100%", phone: "390px" } as const;

/**
 * The email exactly as the API renders it, in a sandboxed frame (no scripts, no navigation), with
 * a desktop / phone width switch.
 */
export function EmailPreview({ html, pending, error }: { html: string | null; pending?: boolean; error?: string | null }) {
  const [device, setDevice] = useState<keyof typeof widths>("desktop");
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-muted" aria-live="polite">
          {error ?? (pending ? "Updating preview…" : "What subscribers will see")}
        </p>
        <div role="group" aria-label="Preview width" className="glass-inset inline-flex p-1">
          {(["desktop", "phone"] as const).map((d) => (
            <button
              key={d}
              type="button"
              aria-pressed={device === d}
              aria-label={d === "desktop" ? "Desktop width" : "Phone width"}
              onClick={() => setDevice(d)}
              className={cn("rounded-lg p-1.5", device === d ? "bg-primary text-primary-ink" : "text-muted hover:text-ink")}
            >
              {d === "desktop" ? <Monitor className="h-4 w-4" /> : <Smartphone className="h-4 w-4" />}
            </button>
          ))}
        </div>
      </div>
      <div className="flex justify-center overflow-hidden rounded-xl bg-[#f1f5f9]">
        {html === null ? (
          <div className="h-[70vh] w-full animate-pulse bg-inset" aria-hidden />
        ) : (
          <iframe
            title="Email preview"
            sandbox=""
            srcDoc={html}
            style={{ width: widths[device] }}
            className={cn("h-[70vh] max-w-full border-0 bg-white transition-[width]", pending && "opacity-70")}
          />
        )}
      </div>
    </div>
  );
}
