import type { QuestionKind } from "@/shared/jobs/questions";

/** A screening question being edited. `key` is for React; `id` is set on questions already saved. */
export interface QuestionDraft {
  key: string;
  id?: string;
  kind: QuestionKind;
  label: string;
  helpText: string;
  options: string[];
  required: boolean;
}

/** Shape of the job form state (shared by the server pages and the client form). */
export interface JobFormValues {
  title: string;
  company: string;
  companyWebsite: string;
  slug: string;
  city: string;
  country: string;
  workModel: string;
  employmentType: string;
  category: string;
  experience: string;
  salary: string;
  summary: string;
  /** Rich-text job description (HTML). Empty on older jobs, which use summary + lists. */
  description: string;
  responsibilities: string[];
  requirements: string[];
  benefits: string[];
  /** Take applications on Career Reads (CV + questions). */
  onsiteApply: boolean;
  questions: QuestionDraft[];
  applyUrl: string;
  applyEmail: string;
  postedAt: string;
  deadline: string;
  status: "draft" | "published";
  featured: boolean;
  /** Staff only: the company account that owns the job ("" = Career Reads). */
  companyId: string;
}

export const emptyJob = (): JobFormValues => ({
  title: "",
  company: "",
  companyWebsite: "",
  slug: "",
  city: "",
  country: "Pakistan",
  workModel: "on-site",
  employmentType: "full-time",
  category: "",
  experience: "entry",
  salary: "",
  summary: "",
  description: "",
  responsibilities: [""],
  requirements: [""],
  benefits: [],
  onsiteApply: false,
  questions: [],
  applyUrl: "",
  applyEmail: "",
  postedAt: new Date().toISOString().slice(0, 10),
  deadline: "",
  status: "draft",
  featured: false,
  companyId: "",
});

/** The hidden field's value: the questions without their React keys. */
export function questionsField(questions: QuestionDraft[]): string {
  return JSON.stringify(questions.map((q) => ({ id: q.id, kind: q.kind, label: q.label, helpText: q.helpText, options: q.options, required: q.required })));
}

/** Saved questions (from the API) as drafts. */
export function toDrafts(
  questions: {
    id: string;
    kind: QuestionKind;
    label: string;
    helpText?: string;
    options: string[];
    required: boolean;
  }[],
): QuestionDraft[] {
  return questions.map((q) => ({
    ...q,
    key: q.id,
    helpText: q.helpText ?? "",
  }));
}
