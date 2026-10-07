"use server";

import { revalidatePath } from "next/cache";
import { getDb } from "@/db";
import { userPrefs } from "@/db/schema";
import { requireStaff } from "@/lib/auth/require-user";
import { dashboardLayoutSchema } from "@/lib/dashboard/layout";

/** Saves this user's dashboard card order, hidden cards and chart style. */
export async function saveDashboardLayout(input: unknown): Promise<{ ok: boolean }> {
  const user = await requireStaff();
  const layout = dashboardLayoutSchema.parse(input);
  await getDb()
    .insert(userPrefs)
    .values({ userId: user.id, dashboardLayout: layout })
    .onConflictDoUpdate({ target: userPrefs.userId, set: { dashboardLayout: layout } });
  revalidatePath("/");
  return { ok: true };
}
