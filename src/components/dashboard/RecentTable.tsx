import { ArrowRight, Briefcase, FileText, Inbox } from "lucide-react";
import Link from "next/link";
import { StatusPill } from "@/components/admin/Badge";
import { EmptyState } from "@/components/admin/EmptyState";
import { PanelHeader } from "@/components/admin/Glass";
import type { ContentRow } from "@/lib/dashboard/queries";
import { formatDate } from "@/lib/utils";

function Thumb({ row }: { row: ContentRow & { imageUrl: string | null } }) {
  if (row.imageUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={row.imageUrl} alt="" className="h-10 w-14 shrink-0 rounded-lg object-cover" loading="lazy" />;
  }
  const Icon = row.kind === "job" ? Briefcase : FileText;
  return (
    <span className="glass-inset flex h-10 w-14 shrink-0 items-center justify-center text-primary" aria-hidden>
      <Icon className="h-4 w-4" />
    </span>
  );
}

/** "Recent posts & jobs". A table on desktop, stacked cards on phones. */
export function RecentTable({ rows }: { rows: (ContentRow & { imageUrl: string | null })[] }) {
  return (
    <section className="glass rise-in h-full p-5" aria-labelledby="recent-title">
      <PanelHeader
        id="recent-title"
        title="Recent posts & jobs"
        actions={
          <Link href="/posts" className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline">
            View all <ArrowRight className="h-4 w-4" />
          </Link>
        }
      />
      {rows.length === 0 ? (
        <EmptyState compact icon={Inbox} title="Nothing here yet" description="Your newest posts and jobs will show up here." />
      ) : (
        <>
          <table className="hidden w-full border-separate border-spacing-0 text-sm md:table">
            <thead>
              <tr className="text-left text-xs text-muted">
                <th className="rounded-l-xl bg-inset px-3 py-2 font-medium">Title</th>
                <th className="bg-inset px-3 py-2 font-medium">Type</th>
                <th className="bg-inset px-3 py-2 font-medium">Updated</th>
                <th className="rounded-r-xl bg-inset px-3 py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={`${row.kind}-${row.slug}`} className="group">
                  <td className="rounded-l-xl px-3 py-2.5 group-hover:bg-hover">
                    <Link href={row.href} className="flex min-w-0 items-center gap-3 font-medium hover:text-primary">
                      <Thumb row={row} />
                      <span className="min-w-0">
                        <span className="line-clamp-1">{row.title}</span>
                        <span className="block truncate text-xs font-normal text-muted">{row.subtitle}</span>
                      </span>
                    </Link>
                  </td>
                  <td className="px-3 py-2.5 text-muted group-hover:bg-hover">{row.kind === "job" ? "Job" : "Post"}</td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-muted group-hover:bg-hover">
                    <time dateTime={row.date}>{formatDate(row.date)}</time>
                  </td>
                  <td className="rounded-r-xl px-3 py-2.5 group-hover:bg-hover">
                    <StatusPill state={row.state} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <ul className="flex flex-col gap-2 md:hidden">
            {rows.map((row) => (
              <li key={`${row.kind}-${row.slug}`}>
                <Link href={row.href} className="glass-inset flex items-center gap-3 p-3">
                  <Thumb row={row} />
                  <span className="min-w-0 flex-1">
                    <span className="line-clamp-1 text-sm font-medium">{row.title}</span>
                    <span className="text-xs text-muted">
                      {row.kind === "job" ? "Job" : "Post"} · {formatDate(row.date)}
                    </span>
                  </span>
                  <StatusPill state={row.state} />
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
