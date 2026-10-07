"use server";

import { revalidatePath } from "next/cache";
import { apiFetch } from "@/lib/api/client";
import { type ActionResult, toResult } from "@/lib/api/results";
import { requireSuperAdmin } from "@/lib/auth/require-user";

export type SettingsResult = ActionResult;

/** Admins only. Saves ads + site settings; the API refreshes every page on the site. */
export async function saveSettings(input: { ads: unknown; site: unknown }): Promise<SettingsResult> {
  await requireSuperAdmin();
  const result = await toResult(() => apiFetch("/settings", { method: "PUT", body: input }));
  if (result.ok) revalidatePath("/settings");
  return result;
}
