import { Building2, Code, MapPin, Wallet } from "lucide-react";
import { employmentTypeLabels, workModelLabels, type EmploymentType, type WorkModel } from "@/shared/jobs/categories";
import { formatDate } from "@/lib/utils";

export interface JobPreview {
  title: string;
  company: string;
  city?: string;
  country: string;
  workModel: string;
  employmentType: string;
  salary?: string;
  featured: boolean;
  postedAt: string;
}

/**
 * The job card exactly as /jobs shows it (the site's JobCard markup and light theme),
 * so authors see the real result while typing.
 */
export function JobPreviewCard({ job }: { job: JobPreview }) {
  const place = job.city ? `${job.city}, ${job.country}` : job.country;
  const location = job.workModel === "remote" && !job.city ? `Remote · ${place}` : place;
  const tag = "inline-flex items-center rounded-md bg-[#eff6ff] px-2 py-0.5 text-xs font-medium text-[#1d4ed8]";
  return (
    <div className="rounded-2xl bg-white p-4 font-sans text-[#0f172a] shadow-inner">
      <article className="relative flex gap-4 rounded-xl border border-[#e2e8f0] bg-white p-5">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-[#eff6ff] text-[#1d4ed8]" aria-hidden>
          <Code className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-semibold leading-snug">{job.title || "Job title"}</h3>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-[#475569]">
            <Building2 className="h-4 w-4 shrink-0" aria-hidden />
            <span className="truncate">{job.company || "Company"}</span>
          </p>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-[#475569]">
            <MapPin className="h-4 w-4 shrink-0" aria-hidden />
            <span className="truncate">{job.country ? location : "Location"}</span>
          </p>
          {job.salary && (
            <p className="mt-1 flex items-center gap-1.5 text-sm text-[#475569]">
              <Wallet className="h-4 w-4 shrink-0" aria-hidden />
              <span className="truncate">{job.salary}</span>
            </p>
          )}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {job.featured && <span className={`${tag} !bg-amber-100 !text-amber-800`}>Featured</span>}
            {job.employmentType && <span className={tag}>{employmentTypeLabels[job.employmentType as EmploymentType] ?? job.employmentType}</span>}
            {job.workModel && <span className={tag}>{workModelLabels[job.workModel as WorkModel] ?? job.workModel}</span>}
            <span className="ml-auto text-xs text-[#475569]">Posted {formatDate(job.postedAt || new Date())}</span>
          </div>
        </div>
      </article>
    </div>
  );
}
