"use client";

import { Briefcase, Plus } from "lucide-react";
import Link from "next/link";
import { useTransition } from "react";
import { toast } from "sonner";
import { bulkJobs } from "@/app/actions/jobs";
import { StatusPill, type ContentState } from "@/components/admin/Badge";
import { Button, buttonClasses } from "@/components/admin/Button";
import { ConfirmDialog } from "@/components/admin/GlassDialog";
import { DataTable, type PageInfo } from "@/components/table/DataTable";
import { formatDate } from "@/lib/utils";

export interface JobListRow {
  slug: string;
  title: string;
  company: string;
  category: string;
  location: string;
  postedAt: string;
  deadline: string | null;
  state: ContentState;
  featured: boolean;
  sample: boolean;
}

export function JobsTable({
  rows,
  pageInfo,
  filtered,
  needsReview = false,
}: {
  rows: JobListRow[];
  pageInfo: PageInfo;
  filtered: boolean;
  /** Company accounts that aren't trusted: "Publish" becomes "Submit for review". */
  needsReview?: boolean;
}) {
  const [pending, start] = useTransition();
  const bulk = (action: "publish" | "unpublish" | "delete", slugs: string[], clear: () => void) =>
    start(async () => {
      const result = await bulkJobs({ action, slugs });
      (result.ok ? toast.success : toast.error)(result.message);
      clear();
    });

  return (
    <DataTable
      label="Jobs"
      rows={rows}
      getId={(r) => r.slug}
      getHref={(r) => `/jobs/${r.slug}`}
      pageInfo={pageInfo}
      empty={
        filtered
          ? { icon: Briefcase, title: "No jobs match these filters", description: "Try another search or clear the filters." }
          : {
              icon: Briefcase,
              title: "No jobs yet",
              description: needsReview
                ? "Post your first job. Career Reads reviews it and then it appears on the site."
                : "Post your first job. It appears on the site as soon as you publish it.",
              action: (
                <Link href="/jobs/new" className={buttonClasses({ variant: "primary" })}>
                  <Plus /> New job
                </Link>
              ),
            }
      }
      columns={[
        {
          key: "title",
          header: "Job",
          sort: "title",
          cell: (r) => (
            <Link href={`/jobs/${r.slug}`} className="block min-w-0 hover:text-link" tabIndex={-1}>
              <span className="line-clamp-1 font-medium">
                {r.title}
                {r.featured && <span className="ml-2 text-xs font-semibold text-accent">Featured</span>}
                {r.sample && <span className="ml-2 text-xs font-semibold text-muted">Sample</span>}
              </span>
              <span className="block truncate text-xs text-muted">{r.company}</span>
            </Link>
          ),
        },
        { key: "category", header: "Category", cell: (r) => <span className="text-muted">{r.category}</span>, className: "hidden lg:table-cell" },
        { key: "location", header: "Location", cell: (r) => <span className="text-muted">{r.location}</span>, className: "hidden xl:table-cell" },
        { key: "posted", header: "Posted", sort: "posted", cell: (r) => <time className="whitespace-nowrap text-muted" dateTime={r.postedAt}>{formatDate(r.postedAt)}</time> },
        { key: "deadline", header: "Deadline", sort: "deadline", cell: (r) => <span className="whitespace-nowrap text-muted">{formatDate(r.deadline)}</span> },
        { key: "status", header: "Status", cell: (r) => <StatusPill state={r.state} /> },
      ]}
      renderCard={(r) => (
        <Link href={`/jobs/${r.slug}`} className="glass-inset flex items-center gap-3 p-3">
          <span className="min-w-0 flex-1">
            <span className="line-clamp-1 text-sm font-medium">{r.title}</span>
            <span className="block truncate text-xs text-muted">
              {r.company} · {formatDate(r.postedAt)}
            </span>
          </span>
          <StatusPill state={r.state} />
        </Link>
      )}
      bulkActions={(selected, clear) => (
        <>
          <Button size="sm" variant="primary" disabled={pending} onClick={() => bulk("publish", selected, clear)}>
            {needsReview ? "Submit for review" : "Publish"}
          </Button>
          <Button size="sm" disabled={pending} onClick={() => bulk("unpublish", selected, clear)}>
            Unpublish
          </Button>
          <ConfirmDialog
            trigger={
              <Button size="sm" variant="danger" disabled={pending}>
                Delete
              </Button>
            }
            title={`Delete ${selected.length} job${selected.length === 1 ? "" : "s"}?`}
            description="This can't be undone. Unpublish instead to keep them as drafts."
            onConfirm={() => bulk("delete", selected, clear)}
          />
        </>
      )}
    />
  );
}
