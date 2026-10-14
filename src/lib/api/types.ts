/**
 * Shapes of the rows the API returns (the admin no longer has a database schema).
 * Dates arrive as ISO strings; `apiFetch(..., { dates: true })` turns them back into Dates.
 * The API (blognest-api/src/db/schema.ts) is the source of truth.
 */
export type Role = "super_admin" | "editor" | "company";
export type JobReview = "pending" | "approved" | "rejected";
export type ContentStatus = "draft" | "published";
export type Theme = "light" | "dark" | "system";

export interface DashboardLayout {
  order: string[];
  hidden: string[];
  mixStyle?: "bubble" | "donut";
}

export interface CompanyRow {
  id: string;
  name: string;
  website: string | null;
  autoPublish: boolean;
  active: boolean;
  createdAt: Date;
}

export interface ArticleImageRow {
  src: string;
  alt: string;
  caption?: string;
  width: number;
  height: number;
  placement: string;
}

export interface ArticleRow {
  slug: string;
  title: string;
  excerpt: string;
  body: string;
  category: string;
  tags: string[];
  author: string;
  status: ContentStatus;
  publishedAt: Date;
  updatedAt: Date | null;
  featured: boolean;
  trending: boolean;
  editorsPick: boolean;
  coverImage: string;
  coverAlt: string;
  coverWidth: number;
  coverHeight: number;
  images: ArticleImageRow[];
  seoTitle: string | null;
  seoDescription: string | null;
  canonicalUrl: string | null;
  noindex: boolean;
  ads: boolean;
  createdBy: string | null;
  createdAt: Date;
  savedAt: Date;
}

export interface JobRow {
  slug: string;
  title: string;
  company: string;
  companyId: string | null;
  review: JobReview | null;
  reviewNote: string | null;
  companyWebsite: string | null;
  city: string | null;
  country: string;
  workModel: string;
  employmentType: string;
  category: string;
  experience: string;
  salary: string | null;
  summary: string;
  /** Rich-text job description (sanitized HTML). Null on jobs written before the editor. */
  description: string | null;
  responsibilities: string[];
  requirements: string[];
  benefits: string[];
  applyUrl: string | null;
  applyEmail: string | null;
  postedAt: Date;
  deadline: Date | null;
  status: ContentStatus;
  featured: boolean;
  sample: boolean;
  createdBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CategoryRow {
  slug: string;
  kind: "blog" | "job";
  name: string;
  headline: string | null;
  description: string;
  accent: string | null;
  sortOrder: number;
}

export interface AuthorRow {
  slug: string;
  name: string;
  type: "Person" | "Organization";
  role: string;
  bio: string;
  avatar: string;
  links: { website?: string; x?: string; linkedin?: string };
}

export interface MessageRow {
  id: number;
  name: string;
  email: string;
  topic: string | null;
  message: string;
  read: boolean;
  createdAt: Date;
}

export interface SubscriberRow {
  id: number;
  email: string;
  confirmed: boolean;
  createdAt: Date;
}

export type NewsletterStatus = "draft" | "scheduled" | "sending" | "sent";

export interface NewsletterRow {
  id: number;
  subject: string;
  previewText: string;
  /** Markdown. */
  body: string;
  status: NewsletterStatus;
  /** When a scheduled newsletter goes out. */
  scheduledAt: Date | null;
  /** Audience: active subscribers who signed up in [from, to). Both null = everyone. */
  audienceFrom: Date | null;
  audienceTo: Date | null;
  recipients: number;
  sentCount: number;
  failedCount: number;
  createdBy: string | null;
  sentBy: string | null;
  sentAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

/** Lists leave out the body. */
export type NewsletterListRow = Omit<NewsletterRow, "body">;

export type AutomationTrigger = "subscribed";
export type AutomationDeliveryStatus = "pending" | "sent" | "failed" | "skipped";
export type DeliveryStats = Record<AutomationDeliveryStatus, number>;

/** An email sent automatically when something happens (e.g. the welcome email on subscribe). */
export interface AutomationRow {
  id: number;
  name: string;
  trigger: AutomationTrigger;
  /** How long after the trigger it's sent (0 = straight away). */
  delayMinutes: number;
  subject: string;
  previewText: string;
  /** Markdown. */
  body: string;
  active: boolean;
  /** Launch date: triggers before it are ignored. Null = as soon as it's switched on. */
  startsAt: Date | null;
  endsAt: Date | null;
  createdBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/** Lists leave out the body and add delivery counts. */
export type AutomationListRow = Omit<AutomationRow, "body"> & { stats: DeliveryStats };

export interface AutomationDelivery {
  id: number;
  email: string;
  status: AutomationDeliveryStatus;
  dueAt: Date;
  sentAt: Date | null;
  error: string | null;
}
