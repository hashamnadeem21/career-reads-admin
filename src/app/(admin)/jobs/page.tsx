import { Plus, X } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { buttonClasses } from "@/components/admin/Button";
import { GlassPanel, PageHeader } from "@/components/admin/Glass";
import { Notice } from "@/components/admin/Notice";
import { JobsTable } from "@/components/jobs/JobsTable";
import { ListToolbar } from "@/components/table/ListToolbar";
import { requireUser } from "@/lib/auth/require-user";
import { getCompany } from "@/lib/companies/queries";
import { jobState } from "@/lib/content-state";
import { getJobCategories, jobStatusCounts, listJobs, parseJobListParams } from "@/lib/jobs/queries";

export const metadata: Metadata = { title: "Jobs" };

/** Staff see every job; company accounts see only their own (enforced in the queries). */
export default async function JobsPage({ searchParams }: PageProps<"/jobs">) {
  const user = await requireUser();
  const isCompany = user.role === "company";
  const params = parseJobListParams(await searchParams);
  const [list, counts, categories, filterCompany] = await Promise.all([
    listJobs(user, params),
    jobStatusCounts(user),
    getJobCategories(),
    !isCompany && params.company ? getCompany(params.company) : null,
  ]);
  const now = new Date();

  return (
    <>
      <Notice />
      <PageHeader
        title={isCompany ? "Your jobs" : "Jobs"}
        description={
          isCompany
            ? user.companyAutoPublish
              ? `Post, edit and close ${user.companyName}'s job listings.`
              : `Post, edit and close ${user.companyName}'s job listings. New and changed jobs are reviewed by Career Reads before they go live.`
            : "Post, edit and close job listings, and review jobs submitted by companies."
        }
        actions={
          <Link href="/jobs/new" className={buttonClasses({ variant: "primary" })}>
            <Plus /> New job
          </Link>
        }
      />
      {filterCompany && (
        <p className="mb-4 flex flex-wrap items-center gap-2 text-sm text-muted">
          Showing jobs for <strong className="text-ink">{filterCompany.name}</strong>
          <Link href="/jobs" className="inline-flex items-center gap-1 font-semibold text-link hover:underline">
            <X className="h-3.5 w-3.5" aria-hidden /> Show all
          </Link>
        </p>
      )}
      <GlassPanel className="rise-in">
        <ListToolbar
          placeholder={isCompany ? "Search title or city…" : "Search title, company or city…"}
          statuses={[
            { value: "", label: "All", count: counts.all },
            { value: "live", label: "Live", count: counts.live },
            { value: "review", label: "In review", count: counts.review },
            { value: "draft", label: "Drafts", count: counts.draft },
            { value: "scheduled", label: "Scheduled", count: counts.scheduled },
            { value: "expired", label: "Expired", count: counts.expired },
          ]}
          categories={categories.map((c) => ({ value: c.slug, label: c.name }))}
        />
        <JobsTable
          needsReview={isCompany && !user.companyAutoPublish}
          filtered={Boolean(params.q || params.status || params.category || params.company)}
          pageInfo={{ page: list.page, pageSize: list.pageSize, total: list.total }}
          rows={list.rows.map(({ job, categoryName, accountName }) => ({
            slug: job.slug,
            title: job.title,
            company: !isCompany && accountName ? `${job.company} · company account` : job.company,
            category: categoryName ?? job.category,
            location: job.city ? `${job.city}, ${job.country}` : job.workModel === "remote" ? `Remote · ${job.country}` : job.country,
            postedAt: job.postedAt.toISOString(),
            deadline: job.deadline?.toISOString() ?? null,
            state: jobState(job, now),
            featured: job.featured,
            sample: job.sample,
          }))}
        />
      </GlassPanel>
    </>
  );
}
