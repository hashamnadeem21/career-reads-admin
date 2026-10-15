"use client";

import { ClipboardCheck } from "lucide-react";
import Link from "next/link";
import { Badge, type Tone } from "@/components/admin/Badge";
import { DataTable, type PageInfo } from "@/components/table/DataTable";
import { type CompanyRequestListItem, type CompanyRequestStatus, sizeLabel, STATUS_LABELS } from "@/lib/company-requests/types";
import { formatDate, timeAgo } from "@/lib/utils";

const TONES: Record<CompanyRequestStatus, Tone> = { pending: "warning", approved: "success", rejected: "neutral" };

export function RequestStatusBadge({ status }: { status: CompanyRequestStatus }) {
  return (
    <Badge tone={TONES[status]} dot={status === "pending"}>
      {STATUS_LABELS[status]}
    </Badge>
  );
}

/** Company account requests: waiting ones oldest first, so nobody waits longest. */
export function CompanyRequestsTable({ rows, pageInfo, waiting }: { rows: CompanyRequestListItem[]; pageInfo: PageInfo; waiting: boolean }) {
  return (
    <DataTable
      label="Company requests"
      rows={rows}
      getId={(r) => r.id}
      getHref={(r) => `/company-requests/${r.id}`}
      pageInfo={pageInfo}
      empty={
        waiting
          ? { icon: ClipboardCheck, title: "Nothing waiting", description: "New requests from the website's For employers page show up here." }
          : { icon: ClipboardCheck, title: "No requests here yet", description: "Requests you approve or turn down are kept here." }
      }
      columns={[
        {
          key: "company",
          header: "Company",
          cell: (r) => (
            <Link href={`/company-requests/${r.id}`} className="block min-w-0 hover:text-link" tabIndex={-1}>
              <span className="line-clamp-1 font-medium">{r.companyName}</span>
              <span className="block truncate text-xs text-muted">
                {r.industry} · {sizeLabel(r.companySize)}
              </span>
            </Link>
          ),
        },
        {
          key: "contact",
          header: "Contact",
          cell: (r) => (
            <span className="block min-w-0">
              <span className="line-clamp-1">{r.contactName}</span>
              <span className="block truncate text-xs text-muted">
                {r.contactRole} · {r.contactEmail}
              </span>
            </span>
          ),
          className: "hidden md:table-cell",
        },
        { key: "location", header: "Location", cell: (r) => <span className="text-muted">{r.location}</span>, className: "hidden lg:table-cell" },
        {
          key: "sent",
          header: "Sent",
          cell: (r) => (
            <time className="whitespace-nowrap text-muted" dateTime={r.createdAt} title={formatDate(r.createdAt)}>
              {timeAgo(r.createdAt)}
            </time>
          ),
        },
        { key: "status", header: "Status", cell: (r) => <RequestStatusBadge status={r.status} /> },
      ]}
      renderCard={(r) => (
        <Link href={`/company-requests/${r.id}`} className="glass-inset flex items-center gap-3 p-3">
          <span className="min-w-0 flex-1">
            <span className="line-clamp-1 text-sm font-medium">{r.companyName}</span>
            <span className="block truncate text-xs text-muted">
              {r.contactName} · {timeAgo(r.createdAt)}
            </span>
          </span>
          <RequestStatusBadge status={r.status} />
        </Link>
      )}
    />
  );
}
