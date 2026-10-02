import { z } from "zod";
import { jobSchema, type JobInput } from "@/shared/jobs/schema";
import { SLUG_PATTERN } from "@/shared/content/schema";
import { slugify } from "@/lib/utils";

/** Fields the job form posts. Lists arrive as repeated inputs (responsibilities[] etc.). */
export const JOB_LIST_FIELDS = ["responsibilities", "requirements", "benefits"] as const;

export interface ParsedJobForm {
  slug: string;
  originalSlug: string | null;
  data?: JobInput;
  errors?: Record<string, string[] | undefined>;
  values: Record<string, string>;
}

const text = (fd: FormData, key: string) => {
  const v = fd.get(key);
  return typeof v === "string" ? v.trim() : "";
};
const optional = (v: string) => (v === "" ? undefined : v);
const list = (fd: FormData, key: string) =>
  fd
    .getAll(key)
    .map((v) => (typeof v === "string" ? v.trim() : ""))
    .filter(Boolean);

/** "YYYY-MM-DD" from a date input → ISO midnight UTC. */
export function dateInputToIso(value: string): string | undefined {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return value ? value : undefined;
  return `${value}T00:00:00.000Z`;
}

export function jobSlugFrom(title: string, company: string): string {
  return slugify([title, company].filter(Boolean).join(" ")) || "job";
}

/**
 * Turns the submitted form into the exact object the site validates (`jobSchema`).
 * Pure, so it is unit-tested; the Server Action adds DB checks (unique slug, category exists).
 */
export function parseJobForm(fd: FormData): ParsedJobForm {
  const values: Record<string, string> = {};
  for (const [k, v] of fd.entries()) if (typeof v === "string" && !JOB_LIST_FIELDS.includes(k as never)) values[k] = v;

  const title = text(fd, "title");
  const company = text(fd, "company");
  const slugInput = text(fd, "slug").toLowerCase();
  const slug = slugInput || jobSlugFrom(title, company);
  const originalSlug = text(fd, "originalSlug") || null;

  const candidate = {
    title,
    company,
    companyWebsite: optional(text(fd, "companyWebsite")),
    city: optional(text(fd, "city")),
    country: text(fd, "country"),
    workModel: text(fd, "workModel"),
    employmentType: text(fd, "employmentType"),
    category: text(fd, "category"),
    experience: text(fd, "experience"),
    salary: optional(text(fd, "salary")),
    summary: text(fd, "summary"),
    responsibilities: list(fd, "responsibilities"),
    requirements: list(fd, "requirements"),
    benefits: list(fd, "benefits"),
    applyUrl: optional(text(fd, "applyUrl")),
    applyEmail: optional(text(fd, "applyEmail")),
    postedAt: dateInputToIso(text(fd, "postedAt")) ?? "",
    deadline: dateInputToIso(text(fd, "deadline")),
    status: text(fd, "status") === "published" ? "published" : "draft",
    featured: fd.get("featured") === "on",
    sample: false,
  };

  const errors: Record<string, string[]> = {};
  if (!SLUG_PATTERN.test(slug)) errors.slug = ["Use lowercase letters, numbers and dashes"];
  if (slug.length > 100) errors.slug = ["Keep the slug under 100 characters"];
  if (candidate.deadline && candidate.postedAt && candidate.deadline < candidate.postedAt) {
    errors.deadline = ["The deadline can't be before the posted date"];
  }

  const parsed = jobSchema.safeParse(candidate);
  if (!parsed.success) {
    for (const [field, messages] of Object.entries(z.flattenError(parsed.error).fieldErrors)) {
      if (messages?.length) errors[field] = messages as string[];
    }
  }
  if (Object.keys(errors).length || !parsed.success) return { slug, originalSlug, errors, values };
  return { slug, originalSlug, data: parsed.data, values };
}
