import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { EmptyState } from "@/components/admin/EmptyState";
import { PanelHeader } from "@/components/admin/Glass";
import type { ListItem } from "@/lib/dashboard/queries";
import { formatDate } from "@/lib/utils";

/** Small lists: drafts, scheduled posts, jobs closing soon. */
export function WorkList({ title, items, empty, icon, showDate = true }: { title: string; items: ListItem[]; empty: string; icon: LucideIcon; showDate?: boolean }) {
  return (
    <section className="glass rise-in h-full p-5">
      <PanelHeader title={title} />
      {items.length === 0 ? (
        <EmptyState compact icon={icon} title={empty} />
      ) : (
        <ul className="flex flex-col gap-1">
          {items.map((item) => (
            <li key={item.href}>
              <Link href={item.href} className="flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-hover">
                <span className="min-w-0 flex-1">
                  <span className="line-clamp-1 text-sm font-medium">{item.title}</span>
                  <span className="text-xs text-muted">
                    {item.meta}
                    {showDate && item.date && (
                      <>
                        {" · "}
                        <time dateTime={item.date}>{formatDate(item.date)}</time>
                      </>
                    )}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
