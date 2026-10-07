import "server-only";
import type { ContentState } from "@/components/admin/Badge";
import { apiFetch } from "@/lib/api/client";
import type { DashboardLayout } from "@/lib/api/types";

/**
 * Dashboard numbers, from the API (`GET /dashboard`). Everything comes from real rows: when
 * there is no data the UI shows an empty state, never a made-up figure.
 */

export interface StatSummary {
  value: number;
  /** % change vs 30 days ago; null when there is nothing to compare with. */
  delta: number | null;
  /** Oldest → newest. */
  spark: number[];
}

export interface TrafficPoint {
  day: string;
  views: number;
  applies: number;
}

export type MixSlice = {
  slug: string;
  name: string;
  value: number;
};

export interface ContentRow {
  kind: "post" | "job";
  slug: string;
  title: string;
  subtitle: string;
  image: string | null;
  date: string;
  state: ContentState;
  href: string;
}

export interface ListItem {
  slug: string;
  title: string;
  href: string;
  meta: string;
  date: string | null;
}

export interface ActivityItem {
  id: number;
  userName: string | null;
  action: string;
  entity: string;
  label: string | null;
  href: string | null;
  createdAt: string;
}

export interface FeaturedJob {
  slug: string;
  title: string;
  company: string;
  location: string;
  daysLeft: number | null;
}

export interface Dashboard {
  stats: { posts: StatSummary; jobs: StatSummary; subscribers: StatSummary; unreadMessages: StatSummary };
  /** 365 daily points; the traffic card buckets them by range. */
  traffic: { points: TrafficPoint[]; total: number };
  topCategories: { slug: string; name: string; value: number }[];
  mix: { posts: MixSlice[]; jobs: MixSlice[] };
  recent: ContentRow[];
  lists: { drafts: ListItem[]; scheduled: ListItem[]; expiring: ListItem[] };
  featured: FeaturedJob | null;
  activity: ActivityItem[];
  /** This user's saved card layout (resolved by the API). */
  layout: DashboardLayout;
}

/** Everything the staff dashboard shows, in one request. */
export function getDashboard(): Promise<Dashboard> {
  return apiFetch<Dashboard>("/dashboard");
}

/** One page (30) of the activity log, newest first. */
export function getActivityPage(page: number): Promise<{ items: ActivityItem[]; total: number; page: number; pageSize: number }> {
  return apiFetch("/activity", { query: { page } });
}
