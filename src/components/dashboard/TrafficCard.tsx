"use client";

import { Download, LineChart } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/admin/Button";
import { EmptyState } from "@/components/admin/EmptyState";
import { PanelHeader } from "@/components/admin/Glass";
import type { TrafficPoint } from "@/lib/dashboard/queries";
import { cn, formatNumber } from "@/lib/utils";
import { TrafficChart } from "./charts";
import { RANGES, toBuckets, toCsv, type Range } from "./charts/buckets";

/** "Traffic & engagement": range tabs, CSV export, chart, legend and a table view for screen readers. */
export function TrafficCard({
  points,
  total,
  title = "Traffic & engagement",
  description = "Article and job page views, and Apply button clicks",
  fileName = "blognest-traffic",
}: {
  points: TrafficPoint[];
  total: number;
  title?: string;
  description?: string;
  fileName?: string;
}) {
  const [range, setRange] = useState<Range>("30D");
  const buckets = useMemo(() => toBuckets(points, range), [points, range]);
  const totals = buckets.reduce((t, b) => ({ views: t.views + b.views, applies: t.applies + b.applies }), { views: 0, applies: 0 });

  const exportCsv = () => {
    const blob = new Blob([toCsv(buckets)], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = Object.assign(document.createElement("a"), { href: url, download: `${fileName}-${range.toLowerCase()}.csv` });
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <section className="glass rise-in h-full p-5" aria-labelledby="traffic-title">
      <PanelHeader
        id="traffic-title"
        title={title}
        description={description}
        actions={
          <>
            <div role="radiogroup" aria-label="Date range" className="glass-inset flex p-1">
              {RANGES.map((r) => (
                <button
                  key={r}
                  type="button"
                  role="radio"
                  aria-checked={range === r}
                  onClick={() => setRange(r)}
                  className={cn(
                    "num rounded-lg px-2.5 py-1 text-xs font-semibold transition",
                    range === r ? "bg-primary text-primary-ink" : "text-muted hover:text-ink",
                  )}
                >
                  {r}
                </button>
              ))}
            </div>
            <Button size="sm" onClick={exportCsv} disabled={total === 0}>
              <Download /> Export CSV
            </Button>
          </>
        }
      />
      {total === 0 ? (
        <EmptyState icon={LineChart} title="Stats will appear here after your first visitors" description="Views and Apply clicks are counted on the public site: no cookies, no personal data." className="min-h-[280px]" />
      ) : (
        <>
          <ul className="mb-3 flex flex-wrap gap-x-5 gap-y-1 text-[13px]">
            <li className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-chart-1" aria-hidden />
              <span className="text-muted">Page views</span>
              <span className="num font-semibold">{formatNumber(totals.views)}</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-chart-2" aria-hidden />
              <span className="text-muted">Apply clicks</span>
              <span className="num font-semibold">{formatNumber(totals.applies)}</span>
            </li>
            {buckets.at(-1)?.projectedViews !== undefined && (
              <li className="flex items-center gap-2 text-muted">
                <span className="w-5 border-t-2 border-dashed border-faint" aria-hidden /> Projected
              </li>
            )}
          </ul>
          <TrafficChart buckets={buckets} />
          <table className="sr-only">
            <caption>Traffic by period</caption>
            <thead>
              <tr>
                <th>Period</th>
                <th>Page views</th>
                <th>Apply clicks</th>
              </tr>
            </thead>
            <tbody>
              {buckets.map((b) => (
                <tr key={b.key}>
                  <td>{b.label}</td>
                  <td>{b.views}</td>
                  <td>{b.applies}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </section>
  );
}
