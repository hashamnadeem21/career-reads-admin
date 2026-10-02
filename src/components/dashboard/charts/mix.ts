import type { MixSlice } from "@/lib/dashboard/queries";

export interface MixDatum {
  name: string;
  value: number;
  color: string;
}

const COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"];

/**
 * Top 4 categories keep their own colour (fixed order, never cycled); the rest
 * fold into "Other" so we never invent a sixth hue.
 */
export function toMixData(slices: MixSlice[]): MixDatum[] {
  const sorted = [...slices].filter((s) => s.value > 0).sort((a, b) => b.value - a.value || a.name.localeCompare(b.name));
  const head = sorted.slice(0, sorted.length > 5 ? 4 : 5);
  const rest = sorted.slice(head.length);
  const data = head.map((s, i) => ({ name: s.name, value: s.value, color: COLORS[i] }));
  if (rest.length) data.push({ name: "Other", value: rest.reduce((n, s) => n + s.value, 0), color: "var(--ink-faint)" });
  return data;
}
