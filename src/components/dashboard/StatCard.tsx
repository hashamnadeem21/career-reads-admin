"use client";

import { DropdownMenu } from "radix-ui";
import { ArrowDownRight, ArrowUpRight, MoreVertical } from "lucide-react";
import Link from "next/link";
import type { StatSummary } from "@/lib/dashboard/queries";
import { cn } from "@/lib/utils";
import { Sparkline } from "./charts";
import { CountUp } from "./CountUp";

export function StatCard({
  title,
  stat,
  color,
  href,
  hrefLabel,
  sparkLabel,
  showDelta = true,
  index = 0,
}: {
  title: string;
  stat: StatSummary;
  color: string;
  href: string;
  hrefLabel: string;
  sparkLabel: string;
  showDelta?: boolean;
  index?: number;
}) {
  const up = (stat.delta ?? 0) >= 0;
  const hasTrend = stat.spark.some((v) => v > 0);
  return (
    <article className="glass lift rise-in flex min-h-[176px] flex-col p-5" style={{ "--stagger": index } as React.CSSProperties}>
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-[13px] font-medium text-muted">{title}</h3>
        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <button type="button" className="-mr-2 -mt-1 rounded-full p-1.5 text-muted hover:bg-hover" aria-label={`${title} options`}>
              <MoreVertical className="h-4 w-4" />
            </button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Portal>
            <DropdownMenu.Content align="end" sideOffset={6} className="glass-strong z-50 min-w-40 !rounded-xl p-1 text-sm text-ink">
              <DropdownMenu.Item asChild className="block cursor-pointer rounded-lg px-3 py-2 outline-none data-[highlighted]:bg-hover">
                <Link href={href}>{hrefLabel}</Link>
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      </div>
      <p className="mt-2 text-[38px] font-bold leading-none tracking-tighter">
        <CountUp value={stat.value} />
      </p>
      <div className="mt-2 h-5 text-xs">
        {showDelta && stat.delta !== null ? (
          <span className={cn("inline-flex items-center gap-0.5 font-semibold", up ? "text-success" : "text-danger")}>
            {up ? <ArrowUpRight className="h-3.5 w-3.5" aria-hidden /> : <ArrowDownRight className="h-3.5 w-3.5" aria-hidden />}
            {up ? "+" : ""}
            {stat.delta}% <span className="font-normal text-muted">vs last month</span>
          </span>
        ) : showDelta ? (
          <span className="text-muted">No data last month yet</span>
        ) : null}
      </div>
      <div className="-mx-1 mt-auto pt-2">
        {hasTrend ? <Sparkline data={stat.spark} color={color} /> : <div className="h-12" aria-hidden />}
        <p className="sr-only">{sparkLabel}</p>
      </div>
    </article>
  );
}
