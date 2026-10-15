import "server-only";
import { apiFetch, apiGetOrNull } from "@/lib/api/client";
import type { CompanyRequestDetail, CompanyRequestList, CompanyRequestStatus } from "./types";

export type StatusFilter = CompanyRequestStatus | "all";
const FILTERS: readonly StatusFilter[] = ["pending", "approved", "rejected", "all"];

export interface CompanyRequestListParams {
  status: StatusFilter;
  page: number;
}

export function parseCompanyRequestParams(sp: Record<string, string | string[] | undefined>): CompanyRequestListParams {
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)?.trim();
  const status = one(sp.status) as StatusFilter | undefined;
  const page = Number.parseInt(one(sp.page) ?? "1", 10);
  return { status: status && FILTERS.includes(status) ? status : "pending", page: Number.isFinite(page) && page > 0 ? page : 1 };
}

/** One page of requests and the count for every status. Super admins only (the API enforces it). */
export function listCompanyRequests(params: CompanyRequestListParams): Promise<CompanyRequestList> {
  return apiFetch("/company-requests", { query: { status: params.status, page: params.page } });
}

export function getCompanyRequest(id: string): Promise<CompanyRequestDetail | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return Promise.resolve(null);
  return apiGetOrNull(`/company-requests/${encodeURIComponent(id)}`);
}
