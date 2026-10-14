"use client";

import { Search } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { controlClasses, Select } from "@/components/admin/Field";
import { cn } from "@/lib/utils";

/** Search, sign-up method, newsletter and sign-up dates, kept in the URL (and used by the CSV export). */
export function CandidateFilters() {
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

  const date = (key: "from" | "to", label: string) => (
    <label className="flex items-center gap-2 text-[13px] text-muted">
      {label}
      <input
        type="date"
        value={params.get(key) ?? ""}
        onChange={(e) => update({ [key]: e.target.value || null })}
        className={cn(controlClasses(), "h-10 w-[150px]")}
      />
    </label>
  );

  return (
    <div className="glass-inset mb-4 flex flex-col gap-3 p-3 xl:flex-row xl:items-center">
      <label className="relative flex-1">
        <span className="sr-only">Search</span>
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden />
        <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name or email…" className={cn(controlClasses(), "h-10 pl-9")} />
      </label>
      <div className="flex flex-wrap items-center gap-2">
        <div className="w-44">
          <Select aria-label="Signed up with" value={params.get("method") ?? ""} onChange={(e) => update({ method: e.target.value || null })}>
            <option value="">Any sign-up method</option>
            <option value="google">Google</option>
            <option value="password">Email and password</option>
          </Select>
        </div>
        <div className="w-44">
          <Select aria-label="Newsletter" value={params.get("subscribed") ?? ""} onChange={(e) => update({ subscribed: e.target.value || null })}>
            <option value="">Subscribed or not</option>
            <option value="yes">Subscribed</option>
            <option value="no">Not subscribed</option>
          </Select>
        </div>
        {date("from", "Signed up from")}
        {date("to", "to")}
      </div>
    </div>
  );
}
