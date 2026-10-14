"use client";

import { UserRoundCheck } from "lucide-react";
import Link from "next/link";
import { Avatar } from "@/components/admin/Avatar";
import { Badge } from "@/components/admin/Badge";
import { DataTable, type PageInfo } from "@/components/table/DataTable";
import { type CandidateListItem, METHOD_LABELS } from "@/lib/candidates/types";
import { formatDate, timeAgo } from "@/lib/utils";

export function MethodBadge({ method }: { method: CandidateListItem["signupMethod"] }) {
  return <Badge tone={method === "google" ? "info" : "neutral"}>{METHOD_LABELS[method]}</Badge>;
}

/** Candidate accounts, newest sign-ups first. */
export function CandidatesTable({ rows, pageInfo, filtered }: { rows: CandidateListItem[]; pageInfo: PageInfo; filtered: boolean }) {
  return (
    <DataTable
      label="Candidates"
      rows={rows}
      getId={(r) => r.id}
      getHref={(r) => `/candidates/${r.id}`}
      pageInfo={pageInfo}
      empty={
        filtered
          ? { icon: UserRoundCheck, title: "No candidates match", description: "Try another search or filter." }
          : {
              icon: UserRoundCheck,
              title: "No candidate accounts yet",
              description: "People create an account on the website when they apply for a job on Career Reads. They'll show up here.",
            }
      }
      columns={[
        {
          key: "name",
          header: "Candidate",
          cell: (r) => (
            <Link href={`/candidates/${r.id}`} className="flex min-w-0 items-center gap-3 hover:text-link" tabIndex={-1}>
              <Avatar name={r.name} src={r.avatarUrl} size={32} />
              <span className="min-w-0">
                <span className="line-clamp-1 font-medium">{r.name}</span>
                <span className="block truncate text-xs text-muted">{r.email}</span>
              </span>
            </Link>
          ),
        },
        {
          key: "method",
          header: "Signed up with",
          cell: (r) => (
            <span className="flex flex-wrap items-center gap-1.5">
              <MethodBadge method={r.signupMethod} />
              {!r.emailVerified && <Badge tone="warning">Email not confirmed</Badge>}
            </span>
          ),
          className: "hidden md:table-cell",
        },
        {
          key: "joined",
          header: "Signed up",
          cell: (r) => (
            <time className="whitespace-nowrap text-muted" dateTime={r.accountCreatedAt}>
              {formatDate(r.accountCreatedAt)}
            </time>
          ),
        },
        {
          key: "last",
          header: "Last sign-in",
          cell: (r) => <span className="whitespace-nowrap text-muted">{r.lastSignInAt ? timeAgo(r.lastSignInAt) : "—"}</span>,
          className: "hidden lg:table-cell",
        },
        { key: "apps", header: "Applications", cell: (r) => <span className="num">{r.applications}</span>, className: "hidden lg:table-cell text-right" },
        {
          key: "news",
          header: "Newsletter",
          cell: (r) => (r.subscribed ? <Badge tone="success" dot>Subscribed</Badge> : <span className="text-muted">—</span>),
          className: "hidden xl:table-cell",
        },
      ]}
      renderCard={(r) => (
        <Link href={`/candidates/${r.id}`} className="glass-inset flex items-center gap-3 p-3">
          <Avatar name={r.name} src={r.avatarUrl} size={36} />
          <span className="min-w-0 flex-1">
            <span className="line-clamp-1 text-sm font-medium">{r.name}</span>
            <span className="block truncate text-xs text-muted">
              {METHOD_LABELS[r.signupMethod]} · {formatDate(r.accountCreatedAt)}
            </span>
          </span>
          {r.subscribed && <Badge tone="success">Subscribed</Badge>}
        </Link>
      )}
    />
  );
}
