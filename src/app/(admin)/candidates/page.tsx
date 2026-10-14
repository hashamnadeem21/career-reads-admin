import { Activity, Download, Mail, UserPlus, UsersRound } from "lucide-react";
import type { Metadata } from "next";
import { buttonClasses } from "@/components/admin/Button";
import { GlassPanel, PageHeader } from "@/components/admin/Glass";
import { Notice } from "@/components/admin/Notice";
import { StatStrip } from "@/components/admin/StatStrip";
import { CandidateFilters } from "@/components/candidates/CandidateFilters";
import { CandidatesTable } from "@/components/candidates/CandidatesTable";
import { requireSuperAdmin } from "@/lib/auth/require-user";
import { candidateFilterQuery, listCandidates, parseCandidateListParams } from "@/lib/candidates/queries";
import { formatNumber } from "@/lib/utils";

export const metadata: Metadata = { title: "Candidates" };

/** Super admins only: everyone with a candidate account on the website, how they signed up, and a CSV for email marketing. */
export default async function CandidatesPage({ searchParams }: PageProps<"/candidates">) {
  await requireSuperAdmin();
  const params = parseCandidateListParams(await searchParams);
  const list = await listCandidates(params);
  const { stats } = list;
  const filters = candidateFilterQuery(params);

  return (
    <>
      <Notice />
      <PageHeader
        title="Candidates"
        description="People who created an account on the website to apply for jobs on Career Reads. The CSV follows your filters; its “Subscribed to newsletter” column is who agreed to marketing email."
        actions={
          <a href={`/api/export/candidates${filters}`} className={buttonClasses()} download>
            <Download /> Export CSV
          </a>
        }
      />
      <StatStrip
        items={[
          { icon: UsersRound, label: "Accounts", value: formatNumber(stats.accounts) },
          { icon: UserPlus, label: "New this week", value: formatNumber(stats.newThisWeek) },
          { icon: Activity, label: "Active this week", value: formatNumber(stats.activeThisWeek) },
          { icon: Mail, label: "Subscribed", value: formatNumber(stats.subscribed) },
        ]}
      />
      <p className="mb-4 text-sm text-muted">
        {formatNumber(stats.google)} signed up with Google, {formatNumber(stats.password)} with email and password.
      </p>
      <GlassPanel className="rise-in">
        <CandidateFilters />
        <CandidatesTable
          rows={list.items}
          filtered={Boolean(filters)}
          pageInfo={{ page: list.page, pageSize: list.pageSize, total: list.total }}
        />
      </GlassPanel>
    </>
  );
}
