"use server";

import { revalidatePath } from "next/cache";
import { getDb } from "@/db";
import { settings } from "@/db/schema";
import { logAudit } from "@/lib/audit";
import { requireUser } from "@/lib/auth/require-user";
import { revalidateSite } from "@/lib/revalidate-site";
import { adsSettingsSchema, siteSettingsSchema } from "@/shared/settings-schema";

export interface SettingsResult {
  ok: boolean;
  message: string;
  errors?: Record<string, string>;
}

/** Admins only. Saves ads + site settings, then refreshes every page on the site. */
export async function saveSettings(input: { ads: unknown; site: unknown }): Promise<SettingsResult> {
  const user = await requireUser("admin");
  const ads = adsSettingsSchema.safeParse(input.ads);
  const site = siteSettingsSchema.safeParse(input.site);
  if (!ads.success || !site.success) {
    const errors: Record<string, string> = {};
    for (const i of ads.error?.issues ?? []) errors[`ads.${i.path.join(".")}`] = i.message;
    for (const i of site.error?.issues ?? []) errors[`site.${i.path.join(".")}`] = i.message;
    return { ok: false, message: "Please fix the highlighted fields.", errors };
  }
  if (ads.data.enabled && !ads.data.clientId) {
    return { ok: false, message: "Add your AdSense client ID before turning ads on.", errors: { "ads.clientId": "Required when ads are on" } };
  }
  const db = getDb();
  await db.transaction(async (tx) => {
    for (const [key, value] of [["ads", ads.data], ["site", site.data]] as const) {
      await tx.insert(settings).values({ key, value }).onConflictDoUpdate({ target: settings.key, set: { value } });
    }
  });
  await logAudit(user, "updated", "settings", null, "Site settings");
  const refreshed = await revalidateSite({ tags: ["settings"], paths: ["/", "/ads.txt", "/contact", "/about", "/privacy-policy"] });
  revalidatePath("/settings");
  return { ok: true, message: refreshed.ok ? "Settings saved. The site is updated." : "Settings saved. The site will pick them up within the hour." };
}
