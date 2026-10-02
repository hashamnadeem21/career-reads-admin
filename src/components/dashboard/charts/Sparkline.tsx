"use client";

import { useId } from "react";
import { Area, AreaChart, ResponsiveContainer } from "recharts";

/** Tiny area chart fading to transparent. Decorative: the card states the number in text. */
export default function Sparkline({ data, color, height = 48 }: { data: number[]; color: string; height?: number }) {
  const id = useId().replace(/:/g, "");
  const points = data.map((value, i) => ({ i, value }));
  return (
    <div style={{ height }} aria-hidden>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={points} margin={{ top: 4, right: 0, bottom: 0, left: 0 }} accessibilityLayer={false} tabIndex={-1}>
          <defs>
            <linearGradient id={`spark-${id}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.35} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={2}
            fill={`url(#spark-${id})`}
            isAnimationActive={!matchMediaReduced()}
            animationDuration={900}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function matchMediaReduced(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
