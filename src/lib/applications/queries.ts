import "server-only";
import { apiFetch, apiGetOrNull } from "@/lib/api/client";
import { type ApplicationDetail, type ApplicationList, isApplicationStatus } from "./types";

export interface ApplicationListParams {
  job?: string;
  status?: string;
  q?: string;
  page?: number;
}

export function parseApplicationListParams(sp: Record<string, string | string[] | undefined>): ApplicationListParams {
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)?.trim() || undefined;
  const status = one(sp.status);
  const page = Number.parseInt(one(sp.page) ?? "1", 10);
  return {
    job: one(sp.job)?.slice(0, 120),
    status: isApplicationStatus(status) ? status : undefined,
    q: one(sp.q)?.slice(0, 100),
    page: Number.isFinite(page) && page > 0 ? page : 1,
  };
}

/** One page of applications this user may see. The API limits company accounts to their own jobs. */
export function listApplications(params: ApplicationListParams): Promise<ApplicationList> {
  return apiFetch("/applications", { query: { ...params } });
}

/** One application, or null when it doesn't exist or isn't this user's to see. */
export function getApplication(id: string): Promise<ApplicationDetail | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return Promise.resolve(null);
  return apiGetOrNull(`/applications/${encodeURIComponent(id)}`);
}
