import "server-only";
import { apiFetch } from "@/lib/api/client";
import type { AdsSettings, SiteSettings } from "@/shared/settings-schema";

/** Saved settings (or the API's defaults). Empty values mean the site uses its environment variables. */
export function getSettings(): Promise<{ ads: AdsSettings; site: SiteSettings }> {
  return apiFetch("/settings");
}
