import "server-only";
import { cache } from "react";
import type { ContentState } from "@/components/admin/Badge";
import { apiFetch, apiGetOrNull } from "@/lib/api/client";
import type { CompanyRow } from "@/lib/api/types";
import type { TrafficPoint } from "@/lib/dashboard/queries";

/**
 * Company accounts and their job statistics, from the API. Stats come from the site's
 * privacy-friendly `daily_stats` counters (page views and Apply clicks per day).
 */

export interface CompanySummary extends CompanyRow {
  members: number;
  jobsTotal: number;
  jobsLive: number;
  jobsPending: number;
  views30: number;
  applies30: number;
  viewsAll: number;
  appliesAll: number;
}

export interface JobPerformance {
  slug: string;
  title: string;
  state: ContentState;
  views30: number;
  applies30: number;
  viewsAll: number;
  appliesAll: number;
}

export interface CompanyTotals {
  live: number;
  pending: number;
  rejected: number;
  total: number;
  views: number;
  applies: number;
  viewsPrev: number;
  appliesPrev: number;
}

/** Every company with its job counts and traffic (super admin overview). */
export function listCompanies(): Promise<CompanySummary[]> {
  return apiFetch<CompanySummary[]>("/companies", { dates: true });
}

export function getCompany(id: string): Promise<CompanyRow | null> {
  return apiGetOrNull<CompanyRow>(`/companies/${encodeURIComponent(id)}`, { dates: true });
}

/** id, name and website of every company (the staff job form's picker). */
export function companyOptions(): Promise<{ id: string; name: string; website: string | null }[]> {
  return apiFetch("/companies/options");
}

/** One request per page for a company's totals, traffic and per-job numbers. */
const getCompanyDashboard = cache((companyId: string) =>
  apiFetch<{ totals: CompanyTotals; traffic: { points: TrafficPoint[]; total: number }; jobs: JobPerformance[] }>(
    `/companies/${encodeURIComponent(companyId)}/dashboard`,
  ),
);

/** Daily views and Apply clicks across one company's job pages, last 365 days. */
export async function getCompanyTraffic(companyId: string): Promise<{ points: TrafficPoint[]; total: number }> {
  return (await getCompanyDashboard(companyId)).traffic;
}

/** Per-job numbers for one company, best performing first. */
export async function getCompanyJobPerformance(companyId: string): Promise<JobPerformance[]> {
  return (await getCompanyDashboard(companyId)).jobs;
}

/** Headline numbers for a company: live / in review, and the last 30 days vs the 30 before. */
export async function getCompanyTotals(companyId: string): Promise<CompanyTotals> {
  return (await getCompanyDashboard(companyId)).totals;
}

/** Members and pending invites of one company (super admin company page). */
export async function getCompanyPeople(companyId: string) {
  const { members, invites } = await apiFetch<{
    members: { id: string; name: string; email: string; createdAt: Date }[];
    invites: { email: string; name: string; expiresAt: Date }[];
  }>(`/companies/${encodeURIComponent(companyId)}/people`, { dates: true });
  return { members, pending: invites };
}
