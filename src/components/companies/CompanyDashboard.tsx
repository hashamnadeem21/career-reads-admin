import { Plus } from "lucide-react";
import Link from "next/link";
import { buttonClasses } from "@/components/admin/Button";
import { PageHeader } from "@/components/admin/Glass";
import { Notice } from "@/components/admin/Notice";
import { StatCard } from "@/components/dashboard/StatCard";
import { TrafficCard } from "@/components/dashboard/TrafficCard";
import { getCompanyJobPerformance, getCompanyTotals, getCompanyTraffic } from "@/lib/companies/queries";
import type { StatSummary } from "@/lib/dashboard/queries";
import { JobPerformanceTable } from "./JobPerformanceTable";

function pct(now: number, before: number): number | null {
  return before === 0 ? null : Math.round(((now - before) / before) * 1000) / 10;
}

/**
 * Overview for one company: its live jobs, jobs in review, and how its job pages perform.
 * Used as a company account's dashboard and on the super admin's company page.
 */
export async function CompanyStats({
  companyId,
  fileName,
  jobsLink = "/jobs?",
}: {
  companyId: string;
  fileName: string;
  /** Base for "view jobs" links; the super admin's company page filters by company. */
  jobsLink?: string;
}) {
  const [totals, traffic, performance] = await Promise.all([
    getCompanyTotals(companyId),
    getCompanyTraffic(companyId),
    getCompanyJobPerformance(companyId),
  ]);
  const last30 = traffic.points.slice(-30);
  const stat = (value: number, spark: number[] = [], delta: number | null = null): StatSummary => ({ value, delta, spark });

  return (
    <div className="flex flex-col gap-5">
      <div className="-mx-4 flex snap-x snap-mandatory scroll-px-4 gap-4 overflow-x-auto px-4 pb-1 md:mx-0 md:grid md:grid-cols-2 md:overflow-visible md:px-0 md:pb-0 xl:grid-cols-4 [&>*]:w-[78vw] [&>*]:shrink-0 [&>*]:snap-start md:[&>*]:w-auto">
        <StatCard index={0} title="Live jobs" stat={stat(totals.live)} showDelta={false} color="var(--chart-2)" href={`${jobsLink}status=live`} hrefLabel="View live jobs" sparkLabel="" />
        <StatCard
          index={1}
          title={totals.rejected > 0 ? `In review · ${totals.rejected} need changes` : "In review"}
          stat={stat(totals.pending)}
          showDelta={false}
          color="var(--chart-4)"
          href={`${jobsLink}status=review`}
          hrefLabel="View jobs in review"
          sparkLabel=""
        />
        <StatCard
          index={2}
          title="Views, last 30 days"
          stat={stat(totals.views, last30.map((p) => p.views), pct(totals.views, totals.viewsPrev))}
          color="var(--chart-1)"
          href="#job-performance-title"
          hrefLabel="See views per job"
          sparkLabel="Job page views per day over the last 30 days."
        />
        <StatCard
          index={3}
          title="Apply clicks, last 30 days"
          stat={stat(totals.applies, last30.map((p) => p.applies), pct(totals.applies, totals.appliesPrev))}
          color="var(--chart-3)"
          href="#job-performance-title"
          hrefLabel="See Apply clicks per job"
          sparkLabel="Apply button clicks per day over the last 30 days."
        />
      </div>
      <TrafficCard
        points={traffic.points}
        total={traffic.total}
        title="Views & Apply clicks"
        description="Visits to your job pages and clicks on their Apply buttons"
        fileName={fileName}
      />
      <JobPerformanceTable rows={performance} />
    </div>
  );
}

/** Dashboard for company accounts. */
export function CompanyDashboard({ companyId, companyName }: { companyId: string; companyName: string }) {
  const slug = companyName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "company";
  return (
    <>
      <Notice />
      <PageHeader
        title={companyName}
        description="How your job listings are doing on Career Reads."
        actions={
          <Link href="/jobs/new" className={buttonClasses({ variant: "primary" })}>
            <Plus /> Post a job
          </Link>
        }
      />
      <CompanyStats companyId={companyId} fileName={`${slug}-jobs-traffic`} />
    </>
  );
}
