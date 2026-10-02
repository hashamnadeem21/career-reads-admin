"use client";

import { useEffect, useState, useTransition, type ReactNode } from "react";
import { toast } from "sonner";
import { saveDashboardLayout } from "@/app/actions/dashboard";
import { CUSTOMIZE_EVENT } from "@/components/admin/Topbar";
import { DASHBOARD_CARDS, type DashboardCardId, type ResolvedLayout } from "@/lib/dashboard/layout";
import { cn } from "@/lib/utils";
import { CustomizeDialog } from "./CustomizeDialog";
import { MixCard } from "./MixCard";
import type { MixSlice } from "@/lib/dashboard/queries";

const spans = Object.fromEntries(DASHBOARD_CARDS.map((c) => [c.id, c.span])) as Record<DashboardCardId, string>;
const spanClass: Record<string, string> = {
  full: "col-span-full",
  wide: "lg:col-span-2",
  narrow: "lg:col-span-1",
};

/**
 * Lays out the cards in the user's order. The right rail sits beside the grid
 * from 1536px up and moves below the content on smaller screens.
 */
export function DashboardGrid({
  initialLayout,
  cards,
  mix,
}: {
  initialLayout: ResolvedLayout;
  cards: Partial<Record<DashboardCardId, ReactNode>>;
  mix: { posts: MixSlice[]; jobs: MixSlice[] };
}) {
  const [layout, setLayout] = useState(initialLayout);
  const [open, setOpen] = useState(false);
  const [saving, startSaving] = useTransition();

  useEffect(() => {
    const onCustomize = () => setOpen(true);
    window.addEventListener(CUSTOMIZE_EVENT, onCustomize);
    return () => window.removeEventListener(CUSTOMIZE_EVENT, onCustomize);
  }, []);

  const save = (next: ResolvedLayout) =>
    startSaving(async () => {
      const previous = layout;
      setLayout(next);
      try {
        await saveDashboardLayout(next);
        setOpen(false);
        toast.success("Dashboard layout saved");
      } catch {
        setLayout(previous);
        toast.error("Couldn't save your layout. Try again.");
      }
    });

  const visible = layout.order.filter((id) => !layout.hidden.includes(id));
  const render = (id: DashboardCardId) => (id === "content-mix" ? <MixCard posts={mix.posts} jobs={mix.jobs} style={layout.mixStyle} /> : cards[id]);
  const showRail = visible.includes("rail") && cards.rail;

  return (
    <>
      <div className={cn("grid gap-5", showRail && "2xl:grid-cols-[minmax(0,1fr)_320px]")}>
        <div className="grid auto-rows-auto grid-cols-1 gap-5 lg:grid-cols-3 [grid-auto-flow:row_dense]">
          {visible
            .filter((id) => id !== "rail")
            .map((id) => (
              <div key={id} data-card={id} className={cn("min-w-0", spanClass[spans[id]])}>
                {render(id)}
              </div>
            ))}
          {visible.length === 0 && <p className="col-span-full text-sm text-muted">All cards are hidden. Use Customize to bring them back.</p>}
        </div>
        {showRail && <div className="min-w-0">{cards.rail}</div>}
      </div>
      <CustomizeDialog open={open} onOpenChange={setOpen} layout={layout} onSave={save} saving={saving} />
    </>
  );
}
