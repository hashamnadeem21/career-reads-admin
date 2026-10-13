"use server";

import { revalidatePath } from "next/cache";
import { apiFetch } from "@/lib/api/client";
import { requireStaff } from "@/lib/auth/require-user";
import { dashboardLayoutSchema } from "@/lib/dashboard/layout";
import { getOnlineNow } from "@/lib/dashboard/queries";

/** Saves this user's dashboard card order, hidden cards and chart style. */
export async function saveDashboardLayout(input: unknown): Promise<{ ok: boolean }> {
  await requireStaff();
  await apiFetch("/me/dashboard-layout", { method: "PUT", body: dashboardLayoutSchema.parse(input) });
  revalidatePath("/");
  return { ok: true };
}

/** How many people are on the public site right now. */
export async function fetchOnlineNow(): Promise<number> {
  await requireStaff();
  return (await getOnlineNow()).onlineNow;
}
