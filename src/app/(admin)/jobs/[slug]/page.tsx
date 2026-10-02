import { CalendarClock, Eye, MousePointerClick } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { StatusPill } from "@/components/admin/Badge";
import { PageHeader } from "@/components/admin/Glass";
import { Notice } from "@/components/admin/Notice";
import { StatStrip } from "@/components/admin/StatStrip";
import { JobActions } from "@/components/jobs/JobActions";
import { JobForm } from "@/components/jobs/JobForm";
import { requireUser } from "@/lib/auth/require-user";
import { daysLeft, jobState } from "@/lib/content-state";
import { getJob, getJobCategories, getJobStats } from "@/lib/jobs/queries";
import { siteUrl } from "@/lib/site-url";
import { formatNumber } from "@/lib/utils";

export async function generateMetadata({ params }: PageProps<"/jobs/[slug]">): Promise<Metadata> {
  const job = await getJob((await params).slug);
  return { title: job ? `Edit: ${job.title}` : "Job not found" };
}

const day = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : "");

export default async function EditJobPage({ params }: PageProps<"/jobs/[slug]">) {
  await requireUser();
  const { slug } = await params;
  const job = await getJob(slug);
  if (!job) notFound();
  const [categories, stats] = await Promise.all([getJobCategories(), getJobStats(slug)]);
  const state = jobState(job);
  const left = daysLeft(job.deadline);

  return (
    <>
      <Notice />
      <PageHeader
        title={
          <span className="flex flex-wrap items-center gap-3">
            {job.title} <StatusPill state={state} />
          </span>
        }
        description={job.company}
        actions={<JobActions slug={job.slug} title={job.title} published={job.status === "published"} live={state === "live"} siteUrl={siteUrl(`/jobs/${job.slug}`)} />}
      />
      <StatStrip
        items={[
          { icon: Eye, label: "Views", value: formatNumber(stats.views) },
          { icon: MousePointerClick, label: "Apply clicks", value: formatNumber(stats.applies) },
          { icon: CalendarClock, label: "Days left", value: state === "expired" ? "Closed" : left === null ? "No deadline" : String(left) },
        ]}
      />
      <JobForm
        key={job.updatedAt.toISOString()}
        originalSlug={job.slug}
        categories={categories}
        initial={{
          title: job.title,
          company: job.company,
          companyWebsite: job.companyWebsite ?? "",
          slug: job.slug,
          city: job.city ?? "",
          country: job.country,
          workModel: job.workModel,
          employmentType: job.employmentType,
          category: job.category,
          experience: job.experience,
          salary: job.salary ?? "",
          summary: job.summary,
          responsibilities: job.responsibilities,
          requirements: job.requirements,
          benefits: job.benefits,
          applyUrl: job.applyUrl ?? "",
          applyEmail: job.applyEmail ?? "",
          postedAt: day(job.postedAt),
          deadline: day(job.deadline),
          status: job.status,
          featured: job.featured,
        }}
      />
    </>
  );
}
