import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Loading placeholders for `loading.tsx`. Next.js shows them the moment a link is clicked
 * (they're prefetched with the route) while the page's data loads on the server.
 * Shapes follow the real screens so nothing jumps when the content swaps in.
 */

function Bar({ className }: { className?: string }) {
  return <div className={cn("skeleton h-4", className)} />;
}

/** Wraps every skeleton: announced once to screen readers, hidden from the accessibility tree otherwise. */
function Loading({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div role="status" aria-live="polite">
      <span className="sr-only">Loading {label}…</span>
      <div aria-hidden>{children}</div>
    </div>
  );
}

function HeaderSkeleton({ actions = 1 }: { actions?: number }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="space-y-2">
        <Bar className="h-8 w-56" />
        <Bar className="h-3.5 w-72 max-w-[70vw]" />
      </div>
      <div className="flex gap-2">
        {Array.from({ length: actions }, (_, i) => (
          <Bar key={i} className="h-10 w-28 rounded-full" />
        ))}
      </div>
    </div>
  );
}

function Rows({ rows }: { rows: number }) {
  return (
    <div className="divide-y divide-[var(--glass-divider)]">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center gap-4 py-3.5">
          <div className="skeleton h-10 w-14 shrink-0" />
          <div className="min-w-0 flex-1 space-y-2">
            <Bar className={i % 3 === 0 ? "w-3/5" : i % 3 === 1 ? "w-2/5" : "w-1/2"} />
            <Bar className="h-3 w-1/4" />
          </div>
          <Bar className="hidden h-6 w-20 rounded-full sm:block" />
          <Bar className="hidden h-3.5 w-24 md:block" />
        </div>
      ))}
    </div>
  );
}

/** Lists: posts, jobs, messages, newsletters, categories, authors, users, companies, activity. */
export function TableSkeleton({ label, rows = 8 }: { label: string; rows?: number }) {
  return (
    <Loading label={label}>
      <HeaderSkeleton />
      <section className="glass p-5">
        <div className="mb-4 flex flex-wrap gap-2">
          <Bar className="h-10 w-64 max-w-full" />
          <Bar className="h-10 w-28" />
          <Bar className="h-10 w-28" />
        </div>
        <Rows rows={rows} />
      </section>
    </Loading>
  );
}

/** The staff dashboard (and a company's dashboard). */
export function DashboardSkeleton({ label = "dashboard" }: { label?: string }) {
  return (
    <Loading label={label}>
      <HeaderSkeleton actions={0} />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <section key={i} className="glass space-y-3 p-5">
            <Bar className="h-3.5 w-28" />
            <Bar className="h-8 w-16" />
            <div className="skeleton h-12 w-full" />
          </section>
        ))}
      </div>
      <div className="mt-4 grid gap-4 xl:grid-cols-[2fr_1fr]">
        <section className="glass p-5">
          <Bar className="w-44" />
          <Bar className="mt-2 h-3 w-64 max-w-full" />
          <div className="skeleton mt-5 h-[280px] w-full" />
        </section>
        <section className="glass space-y-4 p-5">
          <Bar className="w-40" />
          {Array.from({ length: 5 }, (_, i) => (
            <div key={i} className="space-y-2">
              <Bar className="h-3 w-1/2" />
              <div className="skeleton h-2 w-full rounded-full" />
            </div>
          ))}
        </section>
      </div>
      <section className="glass mt-4 p-5">
        <Bar className="mb-2 w-44" />
        <Rows rows={4} />
      </section>
    </Loading>
  );
}

/** Editors: posts, jobs, newsletters and automations (new or existing). */
export function EditorSkeleton({ label }: { label: string }) {
  return (
    <Loading label={label}>
      <HeaderSkeleton actions={2} />
      <div className="grid gap-4 xl:grid-cols-[1fr_340px]">
        <section className="glass space-y-4 p-5">
          <Bar className="h-11 w-full" />
          <div className="flex gap-2">
            {Array.from({ length: 6 }, (_, i) => (
              <Bar key={i} className="h-8 w-9" />
            ))}
          </div>
          <div className="skeleton h-[52vh] w-full" />
        </section>
        <aside className="glass space-y-5 p-5">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="space-y-2">
              <Bar className="h-3 w-24" />
              <Bar className="h-10 w-full" />
            </div>
          ))}
        </aside>
      </div>
    </Loading>
  );
}

/** Card grids: media library and automations. */
export function GridSkeleton({ label, cards = 8, tall = false }: { label: string; cards?: number; tall?: boolean }) {
  return (
    <Loading label={label}>
      <HeaderSkeleton />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: cards }, (_, i) => (
          <section key={i} className="glass space-y-3 p-4">
            <div className={cn("skeleton w-full", tall ? "aspect-[4/3]" : "h-16")} />
            <Bar className="w-3/4" />
            <Bar className="h-3 w-1/2" />
          </section>
        ))}
      </div>
    </Loading>
  );
}

/** Forms and long pages: settings, help, design. */
export function FormSkeleton({ label, sections = 3 }: { label: string; sections?: number }) {
  return (
    <Loading label={label}>
      <HeaderSkeleton />
      <div className="space-y-4">
        {Array.from({ length: sections }, (_, i) => (
          <section key={i} className="glass space-y-4 p-5">
            <Bar className="w-40" />
            <div className="grid gap-4 md:grid-cols-2">
              {Array.from({ length: 4 }, (_, j) => (
                <div key={j} className="space-y-2">
                  <Bar className="h-3 w-24" />
                  <Bar className="h-10 w-full" />
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </Loading>
  );
}
