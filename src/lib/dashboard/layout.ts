import { z } from "zod";
import type { DashboardLayout } from "@/lib/api/types";

/** Every dashboard card a user can show, hide and reorder in Customize. */
export const DASHBOARD_CARDS = [
  { id: "stats", label: "Stat cards", span: "full" },
  { id: "traffic", label: "Traffic & engagement", span: "wide" },
  { id: "top-categories", label: "Top job categories", span: "narrow" },
  { id: "content-mix", label: "Content mix", span: "narrow" },
  { id: "recent", label: "Recent posts & jobs", span: "wide" },
  { id: "drafts", label: "Drafts", span: "narrow" },
  { id: "scheduled", label: "Scheduled posts", span: "narrow" },
  { id: "expiring", label: "Jobs closing this week", span: "narrow" },
  { id: "rail", label: "Right rail (wide screens)", span: "rail" },
] as const;

export type DashboardCardId = (typeof DASHBOARD_CARDS)[number]["id"];
const IDS = DASHBOARD_CARDS.map((c) => c.id) as DashboardCardId[];

export const dashboardLayoutSchema = z.object({
  order: z.array(z.enum(IDS as [DashboardCardId, ...DashboardCardId[]])).max(IDS.length),
  hidden: z.array(z.enum(IDS as [DashboardCardId, ...DashboardCardId[]])).max(IDS.length),
  mixStyle: z.enum(["bubble", "donut"]).optional(),
});

export interface ResolvedLayout {
  order: DashboardCardId[];
  hidden: DashboardCardId[];
  mixStyle: "bubble" | "donut";
}

/** Fills in cards added after the user last saved, drops unknown ids. */
export function resolveLayout(saved: DashboardLayout | null | undefined): ResolvedLayout {
  const parsed = dashboardLayoutSchema.safeParse(saved ?? {});
  const order = parsed.success ? parsed.data.order.filter((id, i, all) => all.indexOf(id) === i) : [];
  return {
    order: [...order, ...IDS.filter((id) => !order.includes(id))],
    hidden: parsed.success ? parsed.data.hidden : [],
    mixStyle: (parsed.success && parsed.data.mixStyle) || "donut",
  };
}
