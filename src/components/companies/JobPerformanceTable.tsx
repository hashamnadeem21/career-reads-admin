import { BarChart3 } from "lucide-react";
import Link from "next/link";
import { StatusPill } from "@/components/admin/Badge";
import { EmptyState } from "@/components/admin/EmptyState";
import { PanelHeader } from "@/components/admin/Glass";
import type { JobPerformance } from "@/lib/companies/queries";
import { formatNumber } from "@/lib/utils";

const rate = (applies: number, views: number) => (views > 0 ? `${Math.round((applies / views) * 1000) / 10}%` : "—");

/** Views and Apply clicks per job (last 30 days and all time). */
export function JobPerformanceTable({ rows, title = "Job performance" }: { rows: JobPerformance[]; title?: string }) {
  return (
    <section className="glass rise-in p-5" aria-labelledby="job-performance-title">
      <PanelHeader
        id="job-performance-title"
        title={title}
        description="Page views and Apply button clicks for each job. Counted on the public site without cookies or personal data."
      />
      {rows.length === 0 ? (
        <EmptyState icon={BarChart3} title="No jobs yet" description="Numbers appear here once jobs are posted and people start visiting them." />
      ) : (
        <div className="admin-scroll -mx-5 overflow-x-auto px-5">
          <table className="w-full min-w-[640px] text-sm">
            <caption className="sr-only">Views and Apply clicks per job</caption>
            <thead>
              <tr className="border-b border-divider text-left text-xs text-muted">
                <th scope="col" className="py-2 pr-3 font-medium">Job</th>
                <th scope="col" className="px-3 py-2 font-medium">Status</th>
                <th scope="col" className="px-3 py-2 text-right font-medium">Views (30d)</th>
                <th scope="col" className="px-3 py-2 text-right font-medium">Apply clicks (30d)</th>
                <th scope="col" className="px-3 py-2 text-right font-medium">All-time views</th>
                <th scope="col" className="px-3 py-2 text-right font-medium">All-time clicks</th>
                <th scope="col" className="py-2 pl-3 text-right font-medium">Apply rate</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.slug} className="border-b border-divider last:border-0">
                  <th scope="row" className="max-w-[280px] py-2.5 pr-3 text-left font-medium">
                    <Link href={`/jobs/${r.slug}`} className="line-clamp-1 hover:text-link">
                      {r.title}
                    </Link>
                  </th>
                  <td className="px-3 py-2.5">
                    <StatusPill state={r.state} />
                  </td>
                  <td className="num px-3 py-2.5 text-right">{formatNumber(r.views30)}</td>
                  <td className="num px-3 py-2.5 text-right">{formatNumber(r.applies30)}</td>
                  <td className="num px-3 py-2.5 text-right text-muted">{formatNumber(r.viewsAll)}</td>
                  <td className="num px-3 py-2.5 text-right text-muted">{formatNumber(r.appliesAll)}</td>
                  <td className="num py-2.5 pl-3 text-right">{rate(r.appliesAll, r.viewsAll)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
