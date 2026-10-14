import type { Tone } from "@/components/admin/Badge";
import type { AnswerValue, QuestionKind } from "@/shared/jobs/questions";

/** Where an application is in the employer's hiring pipeline (the API's `application_status`). */
export const APPLICATION_STATUSES = [
  "new",
  "reviewed",
  "shortlisted",
  "interviewing",
  "offered",
  "hired",
  "rejected",
  "withdrawn",
] as const;
export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

export const STATUS_LABELS: Record<ApplicationStatus, string> = {
  new: "New",
  reviewed: "Reviewed",
  shortlisted: "Shortlisted",
  interviewing: "Interviewing",
  offered: "Offered",
  hired: "Hired",
  rejected: "Not selected",
  withdrawn: "Withdrawn",
};

export const STATUS_TONES: Record<ApplicationStatus, Tone> = {
  new: "primary",
  reviewed: "neutral",
  shortlisted: "info",
  interviewing: "info",
  offered: "warning",
  hired: "success",
  rejected: "danger",
  withdrawn: "neutral",
};

export function isApplicationStatus(value: unknown): value is ApplicationStatus {
  return typeof value === "string" && (APPLICATION_STATUSES as readonly string[]).includes(value);
}

export interface ApplicationListItem {
  id: string;
  name: string;
  email: string;
  phone: string;
  location: string | null;
  status: ApplicationStatus;
  createdAt: string;
  job: { slug: string; title: string; company: string };
}

export interface ApplicationList {
  items: ApplicationListItem[];
  total: number;
  page: number;
  pageSize: number;
  counts: Record<ApplicationStatus | "all", number>;
}

export interface ApplicationEvent {
  id: number;
  kind: "status_changed" | "note" | "cv_viewed";
  fromStatus: ApplicationStatus | null;
  toStatus: ApplicationStatus | null;
  note: string | null;
  createdAt: string;
  userName: string | null;
}

export interface ApplicationDetail {
  application: {
    id: string;
    jobId: string;
    companyId: string | null;
    name: string;
    email: string;
    phone: string;
    location: string | null;
    linkedinUrl: string | null;
    coverLetter: string | null;
    status: ApplicationStatus;
    statusChangedAt: string;
    consentAt: string;
    createdAt: string;
  };
  job: { slug: string; title: string; company: string } | undefined;
  cv: { name: string; contentType: string; sizeBytes: number } | null;
  answers: { label: string; kind: QuestionKind; value: AnswerValue }[];
  events: ApplicationEvent[];
}

/** An answer as text: "Yes"/"No", choices joined, "Not answered" when skipped. */
export function answerText(value: AnswerValue): string {
  if (value === null) return "Not answered";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (Array.isArray(value)) return value.join(", ");
  return String(value);
}
