import "server-only";
import { apiFetch, apiGetOrNull } from "@/lib/api/client";
import type { CandidateDetail, CandidateList } from "./types";

export interface CandidateListParams {
  q?: string;
  method?: "google" | "password";
  subscribed?: "yes" | "no";
  from?: string;
  to?: string;
  page?: number;
}

const DATE = /^\d{4}-\d{2}-\d{2}$/;

export function parseCandidateListParams(sp: Record<string, string | string[] | undefined>): CandidateListParams {
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)?.trim() || undefined;
  const method = one(sp.method);
  const subscribed = one(sp.subscribed);
  const from = one(sp.from);
  const to = one(sp.to);
  const page = Number.parseInt(one(sp.page) ?? "1", 10);
  return {
    q: one(sp.q)?.slice(0, 100),
    method: method === "google" || method === "password" ? method : undefined,
    subscribed: subscribed === "yes" || subscribed === "no" ? subscribed : undefined,
    from: from && DATE.test(from) ? from : undefined,
    to: to && DATE.test(to) ? to : undefined,
    page: Number.isFinite(page) && page > 0 ? page : 1,
  };
}

/** The filters as a query string (for the CSV link and paging). */
export function candidateFilterQuery(params: CandidateListParams): string {
  const query = new URLSearchParams();
  for (const key of ["q", "method", "subscribed", "from", "to"] as const) {
    const value = params[key];
    if (value) query.set(key, value);
  }
  const qs = query.toString();
  return qs ? `?${qs}` : "";
}

/** One page of candidate accounts with totals. Super admins only (the API enforces it). */
export function listCandidates(params: CandidateListParams): Promise<CandidateList> {
  return apiFetch("/candidates", { query: { ...params } });
}

export function getCandidate(id: string): Promise<CandidateDetail | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return Promise.resolve(null);
  return apiGetOrNull(`/candidates/${encodeURIComponent(id)}`);
}
