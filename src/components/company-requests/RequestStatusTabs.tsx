import Link from "next/link";
import type { StatusFilter } from "@/lib/company-requests/queries";
import type { CompanyRequestList } from "@/lib/company-requests/types";
import { cn, formatNumber } from "@/lib/utils";

const TABS: { status: StatusFilter; label: string }[] = [
  { status: "pending", label: "Waiting" },
  { status: "approved", label: "Approved" },
  { status: "rejected", label: "Turned down" },
  { status: "all", label: "All" },
];

/** Waiting / Approved / Turned down / All, with counts. */
export function RequestStatusTabs({ active, counts }: { active: StatusFilter; counts: CompanyRequestList["counts"] }) {
  const total = counts.pending + counts.approved + counts.rejected;
  return (
    <nav aria-label="Filter by status" className="mb-4 flex flex-wrap gap-2">
      {TABS.map(({ status, label }) => {
        const count = status === "all" ? total : counts[status];
        const current = status === active;
        return (
          <Link
            key={status}
            href={status === "pending" ? "/company-requests" : `/company-requests?status=${status}`}
            aria-current={current ? "page" : undefined}
            className={cn(
              "inline-flex h-9 items-center gap-2 rounded-full px-4 text-sm font-medium transition",
              current ? "bg-primary text-primary-ink" : "bg-inset text-muted hover:bg-hover hover:text-ink",
            )}
          >
            {label}
            <span className={cn("num rounded-full px-1.5 text-xs", current ? "bg-white/20" : "bg-hover")}>{formatNumber(count)}</span>
          </Link>
        );
      })}
    </nav>
  );
}
