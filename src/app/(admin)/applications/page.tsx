import { Download, X } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { buttonClasses } from "@/components/admin/Button";
import { GlassPanel, PageHeader } from "@/components/admin/Glass";
import { Notice } from "@/components/admin/Notice";
import { ApplicationsTable } from "@/components/applications/ApplicationsTable";
import { ForgetCandidateDialog } from "@/components/applications/ForgetCandidateDialog";
import { ListToolbar } from "@/components/table/ListToolbar";
import { listApplications, parseApplicationListParams } from "@/lib/applications/queries";
import { APPLICATION_STATUSES, STATUS_LABELS } from "@/lib/applications/types";
import { requireUser } from "@/lib/auth/require-user";
import { getJob } from "@/lib/jobs/queries";

export const metadata: Metadata = { title: "Applicants" };

/** Applications made on Career Reads. Company accounts see only their own jobs' applicants (the API enforces it). */
export default async function ApplicationsPage({ searchParams }: PageProps<"/applications">) {
  const user = await requireUser();
  const params = parseApplicationListParams(await searchParams);
  const [list, job] = await Promise.all([listApplications(params), params.job ? getJob(params.job) : null]);
  const exportHref = `/api/export/applications${params.job ? `?job=${encodeURIComponent(params.job)}` : ""}`;

  return (
    <>
      <Notice />
      <PageHeader
        title="Applicants"
        description={
          user.role === "company"
            ? `People who applied to ${user.companyName}'s jobs on Career Reads, with their CVs and answers.`
            : user.role === "editor"
              ? "People who applied on Career Reads to jobs posted by Career Reads."
              : "Everyone who applied on Career Reads, to any company's job."
        }
        actions={
          <>
            {user.role === "super_admin" && <ForgetCandidateDialog />}
            <a href={exportHref} className={buttonClasses()} download>
              <Download /> Export CSV
            </a>
          </>
        }
      />
      {params.job && (
        <p className="mb-4 flex flex-wrap items-center gap-2 text-sm text-muted">
          Showing applicants for{" "}
          {job ? (
            <Link href={`/jobs/${job.slug}`} className="font-semibold text-ink hover:text-link">
              {job.title}
            </Link>
          ) : (
            <strong className="text-ink">{params.job}</strong>
          )}
          <Link href="/applications" className="inline-flex items-center gap-1 font-semibold text-link hover:underline">
            <X className="h-3.5 w-3.5" aria-hidden /> All jobs
          </Link>
        </p>
      )}
      <GlassPanel className="rise-in">
        <ListToolbar
          placeholder="Search name, email or phone…"
          statuses={[
            { value: "", label: "All", count: list.counts.all },
            ...APPLICATION_STATUSES.filter((s) => s !== "withdrawn" || list.counts.withdrawn > 0).map((s) => ({
              value: s,
              label: STATUS_LABELS[s],
              count: list.counts[s],
            })),
          ]}
        />
        <ApplicationsTable
          rows={list.items}
          showJob={!params.job}
          filtered={Boolean(params.q || params.status)}
          pageInfo={{ page: list.page, pageSize: list.pageSize, total: list.total }}
        />
      </GlassPanel>
    </>
  );
}
