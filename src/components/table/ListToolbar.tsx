"use client";

import { Search } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { Select, controlClasses } from "@/components/admin/Field";
import { cn } from "@/lib/utils";

/** Search, status chips and a category select, all kept in the URL so lists can be shared and reloaded. */
export function ListToolbar({
  statuses,
  categories,
  placeholder = "Search…",
}: {
  statuses: { value: string; label: string; count?: number }[];
  categories?: { value: string; label: string }[];
  placeholder?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [q, setQ] = useState(params.get("q") ?? "");
  const [, startTransition] = useTransition();

  const update = (changes: Record<string, string | null>) => {
    const next = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(changes)) {
      if (!v) next.delete(k);
      else next.set(k, v);
    }
    next.delete("page");
    const qs = next.toString();
    startTransition(() => router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false }));
  };

  useEffect(() => {
    if ((params.get("q") ?? "") === q) return;
    const timer = setTimeout(() => update({ q: q.trim() || null }), 250);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const status = params.get("status") ?? "";

  return (
    <div className="glass-inset mb-4 flex flex-col gap-3 p-3 lg:flex-row lg:items-center">
      <label className="relative flex-1">
        <span className="sr-only">Search</span>
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden />
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={placeholder}
          className={cn(controlClasses(), "h-10 pl-9")}
        />
      </label>
      <div role="radiogroup" aria-label="Status" className="flex flex-wrap gap-1.5">
        {statuses.map((s) => (
          <button
            key={s.value}
            type="button"
            role="radio"
            aria-checked={status === s.value}
            onClick={() => update({ status: s.value || null })}
            className={cn(
              "inline-flex h-9 items-center gap-1.5 rounded-full border px-3 text-[13px] font-semibold transition",
              status === s.value ? "border-primary bg-primary text-primary-ink" : "border-glass-border bg-inset text-muted hover:text-ink",
            )}
          >
            {s.label}
            {s.count !== undefined && <span className="num text-xs opacity-80">{s.count}</span>}
          </button>
        ))}
      </div>
      {categories && (
        <div className="lg:w-56">
          <Select aria-label="Category" value={params.get("category") ?? ""} onChange={(e) => update({ category: e.target.value || null })}>
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </Select>
        </div>
      )}
    </div>
  );
}
