import { Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { buttonClasses } from "@/components/admin/Button";
import { GlassPanel, PageHeader } from "@/components/admin/Glass";
import { Notice } from "@/components/admin/Notice";
import { JobsTable } from "@/components/jobs/JobsTable";
import { ListToolbar } from "@/components/table/ListToolbar";
import { requireUser } from "@/lib/auth/require-user";
import { jobState } from "@/lib/content-state";
import { getJobCategories, jobStatusCounts, listJobs, parseJobListParams } from "@/lib/jobs/queries";

export const metadata: Metadata = { title: "Jobs" };

export default async function JobsPage({ searchParams }: PageProps<"/jobs">) {
  await requireUser();
  const params = parseJobListParams(await searchParams);
  const [list, counts, categories] = await Promise.all([listJobs(params), jobStatusCounts(), getJobCategories()]);
  const now = new Date();

  return (
    <>
      <Notice />
      <PageHeader
        title="Jobs"
        description="Post, edit and close job listings."
        actions={
          <Link href="/jobs/new" className={buttonClasses({ variant: "primary" })}>
            <Plus /> New job
          </Link>
        }
      />
      <GlassPanel className="rise-in">
        <ListToolbar
          placeholder="Search title, company or city…"
          statuses={[
            { value: "", label: "All", count: counts.all },
            { value: "live", label: "Live", count: counts.live },
            { value: "draft", label: "Drafts", count: counts.draft },
            { value: "scheduled", label: "Scheduled", count: counts.scheduled },
            { value: "expired", label: "Expired", count: counts.expired },
          ]}
          categories={categories.map((c) => ({ value: c.slug, label: c.name }))}
        />
        <JobsTable
          filtered={Boolean(params.q || params.status || params.category)}
          pageInfo={{ page: list.page, pageSize: list.pageSize, total: list.total }}
          rows={list.rows.map(({ job, categoryName }) => ({
            slug: job.slug,
            title: job.title,
            company: job.company,
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
