"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import type { MixDatum } from "./mix";

/** Donut with the leading share in the centre. Legend is rendered by the card. */
export default function MixDonut({ data, height = 200 }: { data: MixDatum[]; height?: number }) {
  const total = data.reduce((n, d) => n + d.value, 0);
  const top = data[0];
  return (
    <div className="relative" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            innerRadius="64%"
            outerRadius="92%"
            paddingAngle={data.length > 1 ? 2 : 0}
            cornerRadius={4}
            stroke="none"
            isAnimationActive={typeof window !== "undefined" && !window.matchMedia("(prefers-reduced-motion: reduce)").matches}
          >
            {data.map((d) => (
              <Cell key={d.name} fill={d.color} />
            ))}
          </Pie>
          <Tooltip
            content={({ active, payload }) =>
              active && payload?.[0] ? (
                <div className="glass-strong !rounded-xl px-3 py-2 text-xs text-ink">
                  <span className="font-semibold">{payload[0].name}</span>: <span className="num">{String(payload[0].value)}</span>
                </div>
              ) : null
            }
          />
        </PieChart>
      </ResponsiveContainer>
      {top && total > 0 && (
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="num text-2xl font-bold">{Math.round((top.value / total) * 100)}%</span>
          <span className="max-w-24 truncate text-xs text-muted">{top.name}</span>
        </div>
      )}
    </div>
  );
}
