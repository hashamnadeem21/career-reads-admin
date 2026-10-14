"use client";

import { FileUser } from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { bulkApplicationStatus } from "@/app/actions/applications";
import { Badge } from "@/components/admin/Badge";
import { Button } from "@/components/admin/Button";
import { Select } from "@/components/admin/Field";
import { DataTable, type PageInfo } from "@/components/table/DataTable";
import { APPLICATION_STATUSES, type ApplicationListItem, STATUS_LABELS, STATUS_TONES } from "@/lib/applications/types";
import { formatDate } from "@/lib/utils";

export function StatusBadge({ status }: { status: ApplicationListItem["status"] }) {
  return (
    <Badge tone={STATUS_TONES[status]} dot>
      {STATUS_LABELS[status]}
    </Badge>
  );
}

/** Applicants, newest first. Select several to move them to a status together. */
export function ApplicationsTable({
  rows,
  pageInfo,
  filtered,
  showJob,
}: {
  rows: ApplicationListItem[];
  pageInfo: PageInfo;
  filtered: boolean;
  /** Off when the list is already one job's applicants. */
  showJob: boolean;
}) {
  const [pending, start] = useTransition();
  const [bulkStatus, setBulkStatus] = useState<string>("reviewed");

  return (
    <DataTable
      label="Applicants"
      rows={rows}
      getId={(r) => r.id}
      getHref={(r) => `/applications/${r.id}`}
      pageInfo={pageInfo}
      empty={
        filtered
          ? { icon: FileUser, title: "No applicants match", description: "Try another search or status." }
          : {
              icon: FileUser,
              title: "No applicants yet",
              description:
                "When a job takes applications on Career Reads, candidates' CVs and answers arrive here. Turn it on under “How candidates apply” in a job.",
            }
      }
      columns={[
        {
          key: "name",
          header: "Candidate",
          cell: (r) => (
            <Link href={`/applications/${r.id}`} className="block min-w-0 hover:text-link" tabIndex={-1}>
              <span className="line-clamp-1 font-medium">
                {r.status === "new" && <span className="mr-2 inline-block h-2 w-2 rounded-full bg-primary align-middle" aria-label="New" />}
                {r.name}
              </span>
              <span className="block truncate text-xs text-muted">{r.email}</span>
            </Link>
          ),
        },
        ...(showJob
          ? [
              {
                key: "job",
                header: "Job",
                cell: (r: ApplicationListItem) => (
                  <span className="block min-w-0">
                    <span className="line-clamp-1">{r.job.title}</span>
                    <span className="block truncate text-xs text-muted">{r.job.company}</span>
                  </span>
                ),
                className: "hidden lg:table-cell",
              },
            ]
          : []),
        { key: "location", header: "Location", cell: (r) => <span className="text-muted">{r.location ?? "—"}</span>, className: "hidden xl:table-cell" },
        {
          key: "applied",
          header: "Applied",
          cell: (r) => (
            <time className="whitespace-nowrap text-muted" dateTime={r.createdAt}>
              {formatDate(r.createdAt)}
            </time>
          ),
        },
        { key: "status", header: "Status", cell: (r) => <StatusBadge status={r.status} /> },
      ]}
      renderCard={(r) => (
        <Link href={`/applications/${r.id}`} className="glass-inset flex items-center gap-3 p-3">
          <span className="min-w-0 flex-1">
            <span className="line-clamp-1 text-sm font-medium">{r.name}</span>
            <span className="block truncate text-xs text-muted">
              {showJob ? `${r.job.title} · ` : ""}
              {formatDate(r.createdAt)}
            </span>
          </span>
          <StatusBadge status={r.status} />
        </Link>
      )}
      bulkActions={(selected, clear) => (
        <>
          <label className="sr-only" htmlFor="bulk-status">
            New status
          </label>
          <Select id="bulk-status" value={bulkStatus} onChange={(e) => setBulkStatus(e.target.value)} className="!h-8 w-auto text-[13px]">
            {APPLICATION_STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABELS[s]}
              </option>
            ))}
          </Select>
          <Button
            size="sm"
            variant="primary"
            disabled={pending}
            onClick={() =>
              start(async () => {
                const result = await bulkApplicationStatus(selected, bulkStatus);
                (result.ok ? toast.success : toast.error)(result.message);
                clear();
              })
            }
          >
            Move {selected.length} to {STATUS_LABELS[bulkStatus as ApplicationListItem["status"]]}
          </Button>
        </>
      )}
    />
  );
}
