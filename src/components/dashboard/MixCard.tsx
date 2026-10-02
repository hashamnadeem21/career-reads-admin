"use client";

import { PieChart } from "lucide-react";
import { useState } from "react";
import { EmptyState } from "@/components/admin/EmptyState";
import { PanelHeader } from "@/components/admin/Glass";
import type { MixSlice } from "@/lib/dashboard/queries";
import { cn } from "@/lib/utils";
import { MixDonut } from "./charts";
import { toMixData, type MixDatum } from "./charts/mix";

function Bubbles({ data }: { data: MixDatum[] }) {
  const max = Math.max(...data.map((d) => d.value));
  return (
    <div className="flex h-[200px] flex-wrap content-center items-center justify-center gap-2" aria-hidden>
      {data.map((d) => {
        const size = 44 + Math.sqrt(d.value / max) * 76;
        return (
          <span
            key={d.name}
            className="num flex items-center justify-center rounded-full text-sm font-bold text-white shadow-lg"
            style={{ width: size, height: size, background: d.color }}
          >
            {d.value}
          </span>
        );
      })}
    </div>
  );
}

/** "Content mix": live posts or active jobs per category, as a donut or bubbles (chosen in Customize). */
export function MixCard({ posts, jobs, style }: { posts: MixSlice[]; jobs: MixSlice[]; style: "donut" | "bubble" }) {
  const [tab, setTab] = useState<"posts" | "jobs">("posts");
  const data = toMixData(tab === "posts" ? posts : jobs);
  const total = data.reduce((n, d) => n + d.value, 0);
  return (
    <section className="glass rise-in h-full p-5">
      <PanelHeader
        title="Content mix"
        description={tab === "posts" ? "Live posts by category" : "Active jobs by category"}
        actions={
          <div role="radiogroup" aria-label="Content type" className="glass-inset flex p-1">
            {(["posts", "jobs"] as const).map((t) => (
              <button
                key={t}
                type="button"
                role="radio"
                aria-checked={tab === t}
                onClick={() => setTab(t)}
                className={cn("rounded-lg px-2.5 py-1 text-xs font-semibold capitalize", tab === t ? "bg-primary text-primary-ink" : "text-muted hover:text-ink")}
              >
                {t}
              </button>
            ))}
          </div>
        }
      />
      {total === 0 ? (
        <EmptyState compact icon={PieChart} title={tab === "posts" ? "No live posts yet" : "No active jobs yet"} className="min-h-[200px]" />
      ) : (
        <>
          {style === "donut" ? <MixDonut data={data} /> : <Bubbles data={data} />}
          <ul className="mt-4 grid grid-cols-2 gap-x-4 gap-y-1.5 text-[13px]">
            {data.map((d) => (
              <li key={d.name} className="flex min-w-0 items-center gap-2">
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: d.color }} aria-hidden />
                <span className="truncate text-muted">{d.name}</span>
                <span className="num ml-auto font-semibold">{d.value}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
