// Copied from blognest/src/lib/jobs/categories.ts by scripts/sync-shared.mjs. Do not edit here: change the site, then re-run `npm run sync:shared`.
export const JOB_CATEGORY_SLUGS = [
  "software-it",
  "design-creative",
  "marketing-content",
  "sales-business",
  "finance-accounting",
  "customer-support",
  "operations-admin",
  "education-training",
] as const;

export type JobCategorySlug = (typeof JOB_CATEGORY_SLUGS)[number];

export interface JobCategory {
  slug: JobCategorySlug;
  name: string;
  description: string;
}

export const jobCategories: Record<JobCategorySlug, JobCategory> = {
  "software-it": {
    slug: "software-it",
    name: "Software & IT",
    description: "Developers, QA, DevOps, data, and IT support roles.",
  },
  "design-creative": {
    slug: "design-creative",
    name: "Design & Creative",
    description: "UI/UX, graphic design, video, and creative roles.",
  },
  "marketing-content": {
    slug: "marketing-content",
    name: "Marketing & Content",
    description: "Digital marketing, SEO, social media, and writing.",
  },
  "sales-business": {
    slug: "sales-business",
    name: "Sales & Business",
    description: "Sales, business development, and account management.",
  },
  "finance-accounting": {
    slug: "finance-accounting",
    name: "Finance & Accounting",
    description: "Accounting, audit, banking, and finance roles.",
  },
  "customer-support": {
    slug: "customer-support",
    name: "Customer Support",
    description: "Support, success, and call-center roles.",
  },
  "operations-admin": {
    slug: "operations-admin",
    name: "Operations & Admin",
    description: "HR, admin, logistics, and operations roles.",
  },
  "education-training": {
    slug: "education-training",
    name: "Education & Training",
    description: "Teaching, tutoring, and training roles.",
  },
};

export const jobCategoryList: JobCategory[] = JOB_CATEGORY_SLUGS.map((slug) => jobCategories[slug]);

export function isJobCategorySlug(value: string): value is JobCategorySlug {
  return (JOB_CATEGORY_SLUGS as readonly string[]).includes(value);
}

export const EMPLOYMENT_TYPES = ["full-time", "part-time", "contract", "internship", "freelance"] as const;
export type EmploymentType = (typeof EMPLOYMENT_TYPES)[number];

export const WORK_MODELS = ["on-site", "hybrid", "remote"] as const;
export type WorkModel = (typeof WORK_MODELS)[number];

export const EXPERIENCE_LEVELS = ["entry", "mid", "senior"] as const;
export type ExperienceLevel = (typeof EXPERIENCE_LEVELS)[number];

export const employmentTypeLabels: Record<EmploymentType, string> = {
  "full-time": "Full-time",
  "part-time": "Part-time",
  contract: "Contract",
  internship: "Internship",
  freelance: "Freelance",
};

export const workModelLabels: Record<WorkModel, string> = {
  "on-site": "On-site",
  hybrid: "Hybrid",
  remote: "Remote",
};

export const experienceLabels: Record<ExperienceLevel, string> = {
  entry: "Entry level (0–2 yrs)",
  mid: "Mid level (2–5 yrs)",
  senior: "Senior (5+ yrs)",
};
