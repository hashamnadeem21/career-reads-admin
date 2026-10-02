"use client";

import { Area, AreaChart, CartesianGrid, Line, ResponsiveContainer, Tooltip, XAxis, YAxis, type TooltipContentProps } from "recharts";
import { formatNumber } from "@/lib/utils";
import type { Bucket } from "./buckets";

const SERIES = [
  { key: "views", label: "Page views", color: "var(--chart-1)" },
  { key: "applies", label: "Apply clicks", color: "var(--chart-2)" },
] as const;

function change(now: number, before: number | undefined): string | null {
  if (!before) return null;
  const pct = Math.round(((now - before) / before) * 100);
  return `${pct >= 0 ? "▲ +" : "▼ "}${pct}%`;
}

function GlassTooltip({ active, payload, label, buckets }: TooltipContentProps<number, string> & { buckets: Bucket[] }) {
  if (!active || !payload?.length) return null;
  const index = buckets.findIndex((b) => b.label === label);
  const bucket = buckets[index];
  const prev = buckets[index - 1];
  if (!bucket) return null;
  return (
    <div className="glass-strong min-w-44 !rounded-xl px-3.5 py-3 text-xs text-ink shadow-lg">
      <p className="mb-2 font-semibold">
        {label}
        {bucket.elapsed < 1 && <span className="ml-1 font-normal text-muted">(so far)</span>}
      </p>
      {SERIES.map((s) => {
        const value = bucket[s.key];
        const delta = change(value, prev?.[s.key]);
        return (
          <div key={s.key} className="flex items-center gap-2 py-0.5">
            <span className="h-2 w-2 rounded-full" style={{ background: s.color }} aria-hidden />
            <span className="text-muted">{s.label}</span>
            <span className="num ml-auto font-semibold">{formatNumber(value)}</span>
            {delta && <span className="num w-14 text-right text-muted">{delta}</span>}
          </div>
        );
      })}
      {bucket.projectedViews !== undefined && bucket.elapsed < 1 && (
        <p className="mt-2 border-t border-divider pt-2 text-muted">
          Projected: {formatNumber(bucket.projectedViews)} views · {formatNumber(bucket.projectedApplies ?? 0)} clicks
        </p>
      )}
    </div>
  );
}

/** Page views + apply clicks, with a dashed projection for the period still in progress. */
export default function TrafficChart({ buckets, height = 280 }: { buckets: Bucket[]; height?: number }) {
  const reduced = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={buckets} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
          <defs>
            {SERIES.map((s) => (
              <linearGradient key={s.key} id={`traffic-${s.key}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={s.color} stopOpacity={0.3} />
                <stop offset="100%" stopColor={s.color} stopOpacity={0} />
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid vertical={false} stroke="var(--glass-divider)" />
          <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: "var(--ink-muted)", fontSize: 12 }} minTickGap={16} />
          <YAxis tickLine={false} axisLine={false} allowDecimals={false} tick={{ fill: "var(--ink-muted)", fontSize: 12 }} width={44} />
          <Tooltip
            content={(props) => <GlassTooltip {...(props as TooltipContentProps<number, string>)} buckets={buckets} />}
            cursor={{ stroke: "var(--ink-faint)", strokeDasharray: "4 4" }}
          />
          {SERIES.map((s) => (
            <Area
              key={s.key}
              type="monotone"
              dataKey={s.key}
              name={s.label}
              stroke={s.color}
              strokeWidth={2}
              fill={`url(#traffic-${s.key})`}
              activeDot={{ r: 5, strokeWidth: 2, stroke: "var(--glass-solid-fallback)" }}
              isAnimationActive={!reduced}
              animationDuration={1000}
            />
          ))}
          {SERIES.map((s) => (
            <Line
              key={`${s.key}-projected`}
              type="monotone"
              dataKey={s.key === "views" ? "projectedViews" : "projectedApplies"}
              stroke={s.color}
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={false}
              activeDot={false}
              connectNulls={false}
              isAnimationActive={false}
              legendType="none"
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
