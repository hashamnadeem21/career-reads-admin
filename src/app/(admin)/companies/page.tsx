import { Building2 } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Badge } from "@/components/admin/Badge";
import { EmptyState } from "@/components/admin/EmptyState";
import { GlassPanel, PageHeader } from "@/components/admin/Glass";
import { Notice } from "@/components/admin/Notice";
import { NewCompanyButton } from "@/components/companies/CompanyActions";
import { requireSuperAdmin } from "@/lib/auth/require-user";
import { listCompanies } from "@/lib/companies/queries";
import { formatNumber } from "@/lib/utils";

export const metadata: Metadata = { title: "Companies" };

const rate = (applies: number, views: number) => (views > 0 ? `${Math.round((applies / views) * 1000) / 10}%` : "—");

/** Super admins only: every company account with its jobs, views and Apply clicks. */
export default async function CompaniesPage() {
  await requireSuperAdmin();
  const companies = await listCompanies();
  const totals = companies.reduce((t, c) => ({ views: t.views + c.views30, applies: t.applies + c.applies30 }), { views: 0, applies: 0 });

  return (
    <>
      <Notice />
      <PageHeader
        title="Companies"
        description="Employers with their own login. They post and manage only their own jobs; you see how every company's jobs perform."
        actions={<NewCompanyButton />}
      />
      <GlassPanel className="rise-in">
        {companies.length === 0 ? (
          <EmptyState
            icon={Building2}
            title="No companies yet"
            description="Add a company, then invite someone from it. They'll get a jobs-only account."
            action={<NewCompanyButton />}
          />
        ) : (
          <div className="admin-scroll -mx-5 overflow-x-auto px-5">
            <table className="w-full min-w-[760px] text-sm">
              <caption className="sr-only">Companies and their job stats</caption>
              <thead>
                <tr className="border-b border-divider text-left text-xs text-muted">
                  <th scope="col" className="py-2 pr-3 font-medium">Company</th>
                  <th scope="col" className="px-3 py-2 text-right font-medium">Live jobs</th>
                  <th scope="col" className="px-3 py-2 text-right font-medium">In review</th>
                  <th scope="col" className="px-3 py-2 text-right font-medium">Views (30d)</th>
                  <th scope="col" className="px-3 py-2 text-right font-medium">Apply clicks (30d)</th>
                  <th scope="col" className="px-3 py-2 text-right font-medium">All-time views</th>
                  <th scope="col" className="px-3 py-2 text-right font-medium">All-time clicks</th>
                  <th scope="col" className="py-2 pl-3 text-right font-medium">Apply rate</th>
                </tr>
              </thead>
              <tbody>
                {companies.map((c) => (
                  <tr key={c.id} className="border-b border-divider last:border-0">
                    <th scope="row" className="py-3 pr-3 text-left font-medium">
                      <Link href={`/companies/${c.id}`} className="hover:text-link">
                        {c.name}
                      </Link>
                      <span className="mt-1 flex flex-wrap gap-1.5">
                        {!c.active && <Badge tone="danger">Paused</Badge>}
                        {c.autoPublish && <Badge tone="success">Trusted</Badge>}
                        <span className="text-xs font-normal text-muted">
                          {c.members} {c.members === 1 ? "person" : "people"} · {c.jobsTotal} {c.jobsTotal === 1 ? "job" : "jobs"}
                        </span>
                      </span>
                    </th>
                    <td className="num px-3 py-3 text-right">{c.jobsLive}</td>
                    <td className="num px-3 py-3 text-right">
                      {c.jobsPending > 0 ? (
                        <Link href={`/jobs?company=${c.id}&status=review`} className="font-semibold text-link hover:underline">
                          {c.jobsPending}
                        </Link>
                      ) : (
                        0
                      )}
                    </td>
                    <td className="num px-3 py-3 text-right">{formatNumber(c.views30)}</td>
                    <td className="num px-3 py-3 text-right">{formatNumber(c.applies30)}</td>
                    <td className="num px-3 py-3 text-right text-muted">{formatNumber(c.viewsAll)}</td>
                    <td className="num px-3 py-3 text-right text-muted">{formatNumber(c.appliesAll)}</td>
                    <td className="num py-3 pl-3 text-right">{rate(c.appliesAll, c.viewsAll)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="text-xs text-muted">
                  <td className="pt-3">All companies, last 30 days</td>
                  <td colSpan={2} />
                  <td className="num px-3 pt-3 text-right font-semibold text-ink">{formatNumber(totals.views)}</td>
                  <td className="num px-3 pt-3 text-right font-semibold text-ink">{formatNumber(totals.applies)}</td>
                  <td colSpan={3} />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </GlassPanel>
    </>
  );
}
