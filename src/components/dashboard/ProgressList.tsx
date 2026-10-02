import type { LucideIcon } from "lucide-react";
import { EmptyState } from "@/components/admin/EmptyState";
import { PanelHeader } from "@/components/admin/Glass";
import { formatNumber } from "@/lib/utils";

/** Label, value and a thin rounded bar that grows on mount (CSS only, so it stays a server component). */
export function ProgressList({
  title,
  description,
  items,
  empty,
  emptyIcon,
  unit,
}: {
  title: string;
  description?: string;
  items: { key: string; label: string; value: number }[];
  empty: string;
  emptyIcon: LucideIcon;
  unit: string;
}) {
  const max = Math.max(1, ...items.map((i) => i.value));
  return (
    <section className="glass rise-in h-full p-5">
      <PanelHeader title={title} description={description} />
      {items.length === 0 ? (
        <EmptyState compact icon={emptyIcon} title={empty} />
      ) : (
        <ul className="flex flex-col gap-4">
          {items.map((item) => (
            <li key={item.key}>
              <div className="mb-1.5 flex items-baseline justify-between gap-3 text-sm">
                <span className="truncate font-medium">{item.label}</span>
                <span className="num shrink-0 text-muted">
                  {formatNumber(item.value)} <span className="sr-only">{unit}</span>
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-inset" aria-hidden>
                <div className="bar-grow h-full rounded-full bg-primary" style={{ width: `${(item.value / max) * 100}%` }} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
