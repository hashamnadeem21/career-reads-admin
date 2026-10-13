"use client";

import { Newspaper, Plus } from "lucide-react";
import Link from "next/link";
import { buttonClasses } from "@/components/admin/Button";
import { LocalTime } from "@/components/admin/LocalTime";
import { DataTable } from "@/components/table/DataTable";
import type { NewsletterStatus as Status } from "@/lib/api/types";
import { formatDate, formatNumber } from "@/lib/utils";
import { NewsletterStatus } from "./NewsletterStatus";

export interface NewsletterListItem {
  id: number;
  subject: string;
  previewText: string;
  status: Status;
  recipients: number;
  sentCount: number;
  failedCount: number;
  /** Sent date for sent newsletters, send time for scheduled ones, last edit for drafts (ISO). */
  date: string;
}

/** "1,204 of 1,210 delivered" once sent; "Waiting to go out" when scheduled; "—" for drafts. */
function delivery(r: NewsletterListItem): string {
  if (r.status === "draft") return "—";
  if (r.status === "scheduled") return "Waiting to go out";
  const failed = r.failedCount ? ` · ${formatNumber(r.failedCount)} failed` : "";
  return `${formatNumber(r.sentCount)} of ${formatNumber(r.recipients)} delivered${failed}`;
}

export function NewslettersTable({ rows }: { rows: NewsletterListItem[] }) {
  return (
    <DataTable
      label="Newsletters"
      rows={rows}
      getId={(r) => String(r.id)}
      getHref={(r) => `/newsletters/${r.id}`}
      pageInfo={{ page: 1, pageSize: Math.max(rows.length, 1), total: rows.length }}
      empty={{
        icon: Newspaper,
        title: "No newsletters yet",
        description: "Write your first one. You can preview it and send yourself a test before it goes to subscribers.",
        action: (
          <Link href="/newsletters/new" className={buttonClasses({ variant: "primary" })}>
            <Plus /> New newsletter
          </Link>
        ),
      }}
      columns={[
        {
          key: "subject",
          header: "Newsletter",
          cell: (r) => (
            <Link href={`/newsletters/${r.id}`} className="block min-w-0 hover:text-link" tabIndex={-1}>
              <span className="line-clamp-1 font-medium">{r.subject}</span>
              {r.previewText && <span className="block truncate text-xs text-muted">{r.previewText}</span>}
            </Link>
          ),
        },
        { key: "delivery", header: "Delivery", cell: (r) => <span className="num whitespace-nowrap text-muted">{delivery(r)}</span>, className: "hidden md:table-cell" },
        {
          key: "date",
          header: "Date",
          cell: (r) =>
            r.status === "scheduled" ? (
              <LocalTime date={r.date} className="whitespace-nowrap font-medium text-link" />
            ) : (
              <time className="whitespace-nowrap text-muted" dateTime={r.date}>
                {formatDate(r.date)}
              </time>
            ),
        },
        { key: "status", header: "Status", cell: (r) => <NewsletterStatus status={r.status} /> },
      ]}
      renderCard={(r) => (
        <Link href={`/newsletters/${r.id}`} className="glass-inset flex items-center gap-3 p-3">
          <span className="min-w-0 flex-1">
            <span className="line-clamp-1 text-sm font-medium">{r.subject}</span>
            <span className="block truncate text-xs text-muted">
              {r.status === "scheduled" ? <LocalTime date={r.date} /> : formatDate(r.date)} · {delivery(r)}
            </span>
          </span>
          <NewsletterStatus status={r.status} />
        </Link>
      )}
    />
  );
}
