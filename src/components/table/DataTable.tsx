"use client";

import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, X } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { Button, buttonClasses } from "@/components/admin/Button";
import { EmptyState } from "@/components/admin/EmptyState";
import { Checkbox } from "@/components/admin/Field";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

export interface Column<T> {
  key: string;
  header: string;
  cell: (row: T) => ReactNode;
  /** URL sort key; omit for unsortable columns. */
  sort?: string;
  className?: string;
}

export interface PageInfo {
  page: number;
  pageSize: number;
  total: number;
}

function useQueryLink() {
  const params = useSearchParams();
  const pathname = usePathname();
  return (changes: Record<string, string | null>) => {
    const next = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(changes)) {
      if (v === null || v === "") next.delete(k);
      else next.set(k, v);
    }
    const qs = next.toString();
    return qs ? `${pathname}?${qs}` : pathname;
  };
}

/**
 * Glass table: inset header, status pills, hover highlight, bulk select, server-side
 * sort and pagination through the URL, arrow-key row focus, stacked cards on phones.
 */
export function DataTable<T>({
  rows,
  columns,
  getId,
  getHref,
  renderCard,
  pageInfo,
  bulkActions,
  empty,
  label,
}: {
  rows: T[];
  columns: Column<T>[];
  getId: (row: T) => string;
  getHref: (row: T) => string;
  renderCard: (row: T) => ReactNode;
  pageInfo: PageInfo;
  bulkActions?: (selected: string[], clear: () => void) => ReactNode;
  empty: { icon: LucideIcon; title: string; description?: string; action?: ReactNode };
  label: string;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const link = useQueryLink();
  const [selected, setSelected] = useState<string[]>([]);
  const bodyRef = useRef<HTMLTableSectionElement>(null);
  const ids = rows.map(getId);
  const allSelected = ids.length > 0 && ids.every((id) => selected.includes(id));
  const someSelected = selected.length > 0 && !allSelected;
  const sort = params.get("sort");
  const dir = params.get("dir") === "asc" ? "asc" : "desc";

  const onRowKey = (e: KeyboardEvent<HTMLTableRowElement>, index: number, href: string) => {
    const rowsEls = bodyRef.current?.querySelectorAll<HTMLTableRowElement>("tr[data-row]");
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      rowsEls?.[Math.min(rows.length - 1, Math.max(0, index + (e.key === "ArrowDown" ? 1 : -1)))]?.focus();
    } else if (e.key === "Enter" && e.target === e.currentTarget) {
      router.push(href);
    }
  };

  const from = pageInfo.total === 0 ? 0 : (pageInfo.page - 1) * pageInfo.pageSize + 1;
  const to = Math.min(pageInfo.total, pageInfo.page * pageInfo.pageSize);
  const pages = Math.max(1, Math.ceil(pageInfo.total / pageInfo.pageSize));

  if (rows.length === 0) {
    return <EmptyState {...empty} />;
  }

  return (
    <div>
      <table className="hidden w-full border-separate border-spacing-0 text-sm md:table" aria-label={label}>
        <thead>
          <tr className="text-left text-xs text-muted">
            {bulkActions && (
              <th className="w-10 rounded-l-xl bg-inset px-3 py-2.5">
                <Checkbox
                  aria-label="Select all on this page"
                  checked={allSelected ? true : someSelected ? "indeterminate" : false}
                  onCheckedChange={(v) => setSelected(v ? ids : [])}
                />
              </th>
            )}
            {columns.map((col, i) => {
              const active = col.sort && sort === col.sort;
              return (
                <th
                  key={col.key}
                  scope="col"
                  aria-sort={active ? (dir === "asc" ? "ascending" : "descending") : undefined}
                  className={cn(
                    "bg-inset px-3 py-2.5 font-medium",
                    !bulkActions && i === 0 && "rounded-l-xl",
                    i === columns.length - 1 && "rounded-r-xl",
                    col.className,
                  )}
                >
                  {col.sort ? (
                    <Link
                      href={link({ sort: col.sort, dir: active && dir === "desc" ? "asc" : "desc", page: null })}
                      className="inline-flex items-center gap-1 hover:text-ink"
                      scroll={false}
                    >
                      {col.header}
                      {active && (dir === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}
                    </Link>
                  ) : (
                    col.header
                  )}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody ref={bodyRef}>
          {rows.map((row, index) => {
            const id = getId(row);
            const href = getHref(row);
            const isSelected = selected.includes(id);
            return (
              <tr
                key={id}
                data-row
                tabIndex={0}
                onKeyDown={(e) => onRowKey(e, index, href)}
                className={cn("group outline-none focus-visible:[&>td]:bg-primary-soft", isSelected && "[&>td]:bg-primary-soft")}
              >
                {bulkActions && (
                  <td className="rounded-l-xl px-3 py-3 group-hover:bg-hover">
                    <Checkbox
                      aria-label={`Select row ${index + 1}`}
                      checked={isSelected}
                      onCheckedChange={(v) => setSelected((s) => (v ? [...s, id] : s.filter((x) => x !== id)))}
                    />
                  </td>
                )}
                {columns.map((col, i) => (
                  <td
                    key={col.key}
                    className={cn(
                      "border-b border-divider px-3 py-3 align-middle group-hover:bg-hover",
                      !bulkActions && i === 0 && "rounded-l-xl",
                      i === columns.length - 1 && "rounded-r-xl",
                      col.className,
                    )}
                  >
                    {col.cell(row)}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>

      <ul className="flex flex-col gap-2 md:hidden" aria-label={label}>
        {rows.map((row) => (
          <li key={getId(row)}>{renderCard(row)}</li>
        ))}
      </ul>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-muted">
        <p>
          Showing <span className="num font-semibold text-ink">{from}–{to}</span> of <span className="num font-semibold text-ink">{pageInfo.total}</span>
        </p>
        <nav className="flex items-center gap-1" aria-label="Pagination">
          <Link
            aria-disabled={pageInfo.page <= 1}
            tabIndex={pageInfo.page <= 1 ? -1 : undefined}
            href={link({ page: String(pageInfo.page - 1) })}
            className={buttonClasses({ size: "icon-sm", className: cn(pageInfo.page <= 1 && "pointer-events-none opacity-40") })}
            aria-label="Previous page"
          >
            <ChevronLeft />
          </Link>
          <span className="num px-2">
            Page {pageInfo.page} of {pages}
          </span>
          <Link
            aria-disabled={pageInfo.page >= pages}
            tabIndex={pageInfo.page >= pages ? -1 : undefined}
            href={link({ page: String(pageInfo.page + 1) })}
            className={buttonClasses({ size: "icon-sm", className: cn(pageInfo.page >= pages && "pointer-events-none opacity-40") })}
            aria-label="Next page"
          >
            <ChevronRight />
          </Link>
        </nav>
      </div>

      {bulkActions && selected.length > 0 && (
        <div className="fixed inset-x-0 bottom-5 z-40 flex justify-center px-4" role="region" aria-label="Bulk actions">
          <div className="glass-strong rise-in flex flex-wrap items-center gap-2 !rounded-full py-2 pl-4 pr-2 shadow-xl">
            <span className="num text-sm font-semibold">{selected.length} selected</span>
            {bulkActions(selected, () => setSelected([]))}
            <Button variant="ghost" size="icon-sm" onClick={() => setSelected([])} aria-label="Clear selection">
              <X />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
