import "server-only";
import { getDb } from "@/db";
import { settings } from "@/db/schema";
import { adsSettingsSchema, siteSettingsSchema, type AdsSettings, type SiteSettings } from "@/shared/settings-schema";

export const DEFAULT_ADS: AdsSettings = {
  enabled: false,
  showPlaceholders: false,
  clientId: "",
  slots: { "in-article": "", sidebar: "", "below-article": "", listing: "" },
};
export const DEFAULT_SITE: SiteSettings = { contactEmail: "", social: { x: "", linkedin: "", github: "" } };

/** Saved settings (or defaults). Empty values mean the site uses its environment variables. */
export async function getSettings(): Promise<{ ads: AdsSettings; site: SiteSettings }> {
  const rows = await getDb().select().from(settings);
  const byKey = new Map(rows.map((r) => [r.key, r.value]));
  const ads = adsSettingsSchema.safeParse(byKey.get("ads"));
  const site = siteSettingsSchema.safeParse(byKey.get("site"));
  return { ads: ads.success ? ads.data : DEFAULT_ADS, site: site.success ? site.data : DEFAULT_SITE };
}
