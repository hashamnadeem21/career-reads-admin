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
