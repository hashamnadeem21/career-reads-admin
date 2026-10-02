import type { LucideIcon } from "lucide-react";
import { GlassInset } from "./Glass";

/** The darker inset bar of key numbers (job: views · apply clicks · days left). */
export function StatStrip({ items }: { items: { icon: LucideIcon; label: string; value: string }[] }) {
  return (
    <GlassInset className="mb-5 grid grid-cols-1 divide-y divide-divider sm:grid-cols-3 sm:divide-x sm:divide-y-0">
      {items.map(({ icon: Icon, label, value }) => (
        <div key={label} className="flex items-center gap-3 px-4 py-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-soft text-link" aria-hidden>
            <Icon className="h-4 w-4" />
          </span>
          <div>
            <p className="text-xs text-muted">{label}</p>
            <p className="num text-lg font-bold leading-tight">{value}</p>
          </div>
        </div>
      ))}
    </GlassInset>
  );
}
