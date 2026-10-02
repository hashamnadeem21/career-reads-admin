import type { TrafficPoint } from "@/lib/dashboard/queries";

export type Range = "12M" | "6M" | "30D" | "7D";
export const RANGES: Range[] = ["12M", "6M", "30D", "7D"];

export interface Bucket {
  key: string;
  label: string;
  views: number;
  applies: number;
  /** Fraction of the bucket that has happened (1 = complete). */
  elapsed: number;
  /** Extrapolated totals for an incomplete last bucket, drawn dashed. */
  projectedViews?: number;
  projectedApplies?: number;
}

const monthFmt = new Intl.DateTimeFormat("en-GB", { month: "short", timeZone: "UTC" });
const dayFmt = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });

/** Groups daily points into months (12M), weeks (6M) or days (30D/7D). Pure, unit-tested. */
export function toBuckets(points: TrafficPoint[], range: Range, today = new Date()): Bucket[] {
  if (range === "30D" || range === "7D") {
    const n = range === "30D" ? 30 : 7;
    return points.slice(-n).map((p) => ({ key: p.day, label: dayFmt.format(new Date(p.day)), views: p.views, applies: p.applies, elapsed: 1 }));
  }

  const byKey = new Map<string, Bucket>();
  const days = range === "12M" ? points : points.slice(-26 * 7);
  for (const p of days) {
    const d = new Date(`${p.day}T00:00:00Z`);
    let key: string;
    let label: string;
    if (range === "12M") {
      key = p.day.slice(0, 7);
      label = monthFmt.format(d);
    } else {
      const monday = new Date(d);
      monday.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
      key = monday.toISOString().slice(0, 10);
      label = dayFmt.format(monday);
    }
    const bucket = byKey.get(key) ?? { key, label, views: 0, applies: 0, elapsed: 1 };
    bucket.views += p.views;
    bucket.applies += p.applies;
    byKey.set(key, bucket);
  }
  const buckets = [...byKey.values()];
  if (range === "12M" && buckets.length > 12) buckets.splice(0, buckets.length - 12);

  // The current month/week is still in progress: project its total from the pace so far.
  const last = buckets.at(-1);
  if (last) {
    const start = new Date(`${last.key.length === 7 ? `${last.key}-01` : last.key}T00:00:00Z`);
    const end = new Date(start);
    if (range === "12M") end.setUTCMonth(end.getUTCMonth() + 1);
    else end.setUTCDate(end.getUTCDate() + 7);
    const elapsed = Math.min(1, Math.max(1 / 31, (today.getTime() - start.getTime()) / (end.getTime() - start.getTime())));
    last.elapsed = elapsed;
    if (elapsed < 1 && buckets.length > 1) {
      last.projectedViews = Math.round(last.views / elapsed);
      last.projectedApplies = Math.round(last.applies / elapsed);
      const prev = buckets[buckets.length - 2];
      prev.projectedViews = prev.views;
      prev.projectedApplies = prev.applies;
    }
  }
  return buckets;
}

export function toCsv(buckets: Bucket[]): string {
  const rows = [["period", "page_views", "apply_clicks"], ...buckets.map((b) => [b.key, String(b.views), String(b.applies)])];
  return rows.map((r) => r.join(",")).join("\n");
}
