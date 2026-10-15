import { CheckCircle2, ClipboardCheck, Hourglass, XCircle } from "lucide-react";
import type { Metadata } from "next";
import { GlassPanel, PageHeader } from "@/components/admin/Glass";
import { StatStrip } from "@/components/admin/StatStrip";
import { CompanyRequestsTable } from "@/components/company-requests/CompanyRequestsTable";
import { RequestStatusTabs } from "@/components/company-requests/RequestStatusTabs";
import { requireSuperAdmin } from "@/lib/auth/require-user";
import { listCompanyRequests, parseCompanyRequestParams } from "@/lib/company-requests/queries";
import { formatNumber } from "@/lib/utils";

export const metadata: Metadata = { title: "Company requests" };

/** Super admins only: companies asking for an account on the website's For employers page. */
export default async function CompanyRequestsPage({ searchParams }: PageProps<"/company-requests">) {
  await requireSuperAdmin();
  const params = parseCompanyRequestParams(await searchParams);
  const list = await listCompanyRequests(params);
  const { counts } = list;

  return (
    <>
      <PageHeader
        title="Company requests"
        description="Companies asking for an account to post jobs, from the website's For employers page. Check their details, then approve to create the company and invite them, or turn the request down."
      />
      <StatStrip
        items={[
          { icon: Hourglass, label: "Waiting", value: formatNumber(counts.pending) },
          { icon: CheckCircle2, label: "Approved", value: formatNumber(counts.approved) },
          { icon: XCircle, label: "Turned down", value: formatNumber(counts.rejected) },
          { icon: ClipboardCheck, label: "All requests", value: formatNumber(counts.pending + counts.approved + counts.rejected) },
        ]}
      />
      <GlassPanel className="rise-in">
        <RequestStatusTabs active={params.status} counts={counts} />
        <CompanyRequestsTable
          rows={list.items}
          waiting={params.status === "pending"}
          pageInfo={{ page: list.page, pageSize: list.pageSize, total: list.total }}
        />
      </GlassPanel>
    </>
  );
}
