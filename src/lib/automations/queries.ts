import "server-only";
import { apiFetch, apiGetOrNull } from "@/lib/api/client";
import type { AutomationDelivery, AutomationListRow, AutomationRow, DeliveryStats } from "@/lib/api/types";

/** Where an automation is in its launch window right now. */
export type AutomationPhase = "upcoming" | "running" | "ended";

function phase(a: Pick<AutomationListRow, "startsAt" | "endsAt">, now: number): AutomationPhase {
  if (a.endsAt && a.endsAt.getTime() <= now) return "ended";
  if (a.startsAt && a.startsAt.getTime() > now) return "upcoming";
  return "running";
}

export async function listAutomations() {
  const data = await apiFetch<{ items: AutomationListRow[]; sendingReady: boolean }>("/automations", { dates: true });
  const now = Date.now();
  return { ...data, items: data.items.map((item) => ({ ...item, phase: phase(item, now) })) };
}

export interface AutomationDetail {
  automation: AutomationRow;
  stats: DeliveryStats;
  failures: { error: string | null; count: number }[];
  recent: AutomationDelivery[];
  sendingReady: boolean;
}

/** Null when it doesn't exist (the page shows not-found). */
export function getAutomation(id: number) {
  return apiGetOrNull<AutomationDetail>(`/automations/${id}`, { dates: true });
}
