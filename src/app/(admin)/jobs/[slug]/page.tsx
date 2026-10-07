import { Building2, CalendarClock, Eye, MessageSquareWarning, MousePointerClick, ShieldCheck } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { StatusPill } from "@/components/admin/Badge";
import { PageHeader } from "@/components/admin/Glass";
import { Notice } from "@/components/admin/Notice";
import { StatStrip } from "@/components/admin/StatStrip";
import { JobActions } from "@/components/jobs/JobActions";
import { JobForm } from "@/components/jobs/JobForm";
import { getCurrentUser } from "@/lib/auth/session";
import { requireUser } from "@/lib/auth/require-user";
import { companyOptions, getCompany } from "@/lib/companies/queries";
import { daysLeft, jobState } from "@/lib/content-state";
import { getJob, getJobCategories, getJobStats } from "@/lib/jobs/queries";
import { siteUrl } from "@/lib/site-url";
import { formatNumber } from "@/lib/utils";

export async function generateMetadata({ params }: PageProps<"/jobs/[slug]">): Promise<Metadata> {
  const user = await getCurrentUser();
  const job = user ? await getJob((await params).slug) : null;
  return { title: job ? `Edit: ${job.title}` : "Job not found" };
}

const day = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : "");

/** Company accounts get a 404 for jobs that aren't theirs (same as a missing job). */
export default async function EditJobPage({ params }: PageProps<"/jobs/[slug]">) {
  const user = await requireUser();
  const isCompany = user.role === "company";
  const { slug } = await params;
  const job = await getJob(slug);
  if (!job) notFound();
  const [categories, stats, companies, owner] = await Promise.all([
    getJobCategories(),
    getJobStats(slug),
    isCompany ? Promise.resolve(undefined) : companyOptions(),
    !isCompany && job.companyId ? getCompany(job.companyId) : null,
  ]);
  const state = jobState(job);
  const left = daysLeft(job.deadline);
  const applyRate = stats.views > 0 ? `${Math.round((stats.applies / stats.views) * 1000) / 10}%` : "—";

  return (
    <>
      <Notice />
      <PageHeader
        title={
          <span className="flex flex-wrap items-center gap-3">
            {job.title} <StatusPill state={state} />
          </span>
        }
        description={
          owner ? (
            <span className="inline-flex items-center gap-1.5">
              <Building2 className="h-4 w-4" aria-hidden />
              {user.role === "super_admin" ? (
                <Link href={`/companies/${owner.id}`} className="font-medium text-link hover:underline">
                  {owner.name}
                </Link>
              ) : (
                owner.name
              )}{" "}
              · posted from their company account
            </span>
          ) : (
            job.company
          )
        }
        actions={
          <JobActions
            slug={job.slug}
            title={job.title}
            published={job.status === "published"}
            live={state === "live"}
            siteUrl={siteUrl(`/jobs/${job.slug}`)}
            reviewing={!isCompany && job.review === "pending"}
            inReview={job.review === "pending"}
            needsReview={isCompany && !user.companyAutoPublish}
          />
        }
      />

      {job.review === "pending" && (
        <p role="status" className="mb-5 flex items-start gap-3 rounded-2xl bg-info-soft px-4 py-3 text-sm text-link">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          {isCompany
            ? "Waiting for review. Career Reads will publish it once it's approved. You can still edit it."
            : "Waiting for your review. Approve to publish it, or send it back with a note."}
        </p>
      )}
      {job.review === "rejected" && job.status === "draft" && (
        <div role="status" className="mb-5 flex items-start gap-3 rounded-2xl bg-danger-soft px-4 py-3 text-sm text-danger">
          <MessageSquareWarning className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <div>
            <p className="font-semibold">{isCompany ? "Career Reads asked for changes" : "Sent back to the company"}</p>
            {job.reviewNote && <p className="mt-1 whitespace-pre-line text-ink">{job.reviewNote}</p>}
            {isCompany && <p className="mt-1">Edit the job, choose “Submit for review” and save.</p>}
          </div>
        </div>
      )}

      <StatStrip
        items={[
          { icon: Eye, label: "Views", value: formatNumber(stats.views) },
          { icon: MousePointerClick, label: `Apply clicks (${applyRate} of views)`, value: formatNumber(stats.applies) },
          { icon: CalendarClock, label: "Days left", value: state === "expired" ? "Closed" : left === null ? "No deadline" : String(left) },
        ]}
      />
      <JobForm
        key={job.updatedAt.toISOString()}
        originalSlug={job.slug}
        categories={categories}
        companies={companies}
        company={isCompany ? { name: user.companyName ?? job.company, autoPublish: user.companyAutoPublish } : undefined}
        state={state}
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
          // A job in review was submitted for publishing; keep that choice selected.
          status: job.status === "published" || job.review === "pending" ? "published" : "draft",
          featured: job.featured,
          companyId: job.companyId ?? "",
        }}
      />
    </>
  );
}
