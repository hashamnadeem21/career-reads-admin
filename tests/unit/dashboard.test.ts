import { describe, expect, it } from "vitest";
import { toBuckets, toCsv } from "@/components/dashboard/charts/buckets";
import { toMixData } from "@/components/dashboard/charts/mix";
import { articleState, daysLeft, jobState } from "@/lib/content-state";
import { resolveLayout } from "@/lib/dashboard/layout";
import type { TrafficPoint } from "@/lib/dashboard/queries";

function days(n: number, end: string, value = (i: number) => i): TrafficPoint[] {
  const last = new Date(`${end}T00:00:00Z`);
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(last);
    d.setUTCDate(last.getUTCDate() - (n - 1 - i));
    return { day: d.toISOString().slice(0, 10), views: value(i), applies: 1 };
  });
}

describe("traffic buckets", () => {
  const points = days(365, "2026-10-02");

  it("uses the last 7 / 30 days as daily buckets", () => {
    expect(toBuckets(points, "7D")).toHaveLength(7);
    expect(toBuckets(points, "30D").at(-1)?.key).toBe("2026-10-02");
  });

  it("groups 12M into at most 12 months and projects the current month", () => {
    const buckets = toBuckets(points, "12M", new Date("2026-10-02T12:00:00Z"));
    expect(buckets).toHaveLength(12);
    const last = buckets.at(-1)!;
    expect(last.key).toBe("2026-10");
    expect(last.applies).toBe(2);
    expect(last.elapsed).toBeLessThan(0.1);
    expect(last.projectedApplies).toBeGreaterThan(last.applies);
    // The dashed projection starts from the previous complete month.
    expect(buckets.at(-2)?.projectedViews).toBe(buckets.at(-2)?.views);
  });

  it("groups 6M by ISO week (Monday)", () => {
    const buckets = toBuckets(points, "6M", new Date("2026-10-02T12:00:00Z"));
    expect(buckets.at(-1)?.key).toBe("2026-09-28");
    expect(buckets.length).toBeGreaterThanOrEqual(26);
  });

  it("exports CSV", () => {
    expect(toCsv(toBuckets(points, "7D")).split("\n")[0]).toBe("period,page_views,apply_clicks");
  });
});

describe("content mix", () => {
  it("keeps the top 4 colours and folds the rest into Other", () => {
    const data = toMixData(["a", "b", "c", "d", "e", "f"].map((s, i) => ({ slug: s, name: s.toUpperCase(), value: 10 - i })));
    expect(data.map((d) => d.name)).toEqual(["A", "B", "C", "D", "Other"]);
    expect(data.at(-1)?.value).toBe(6 + 5);
    expect(data[0].color).toBe("var(--chart-1)");
  });

  it("never shows empty slices", () => {
    expect(toMixData([{ slug: "a", name: "A", value: 0 }])).toEqual([]);
  });
});

describe("dashboard layout", () => {
  it("adds new cards and drops unknown ones", () => {
    const layout = resolveLayout({ order: ["recent", "stats"], hidden: ["traffic"] });
    expect(layout.order.slice(0, 2)).toEqual(["recent", "stats"]);
    expect(layout.order).toContain("rail");
    expect(layout.hidden).toEqual(["traffic"]);
    expect(resolveLayout({ order: ["bogus"], hidden: [] } as never).order[0]).toBe("stats");
  });
});

describe("content state", () => {
  const now = new Date("2026-10-02T12:00:00Z");
  it("labels posts", () => {
    expect(articleState({ status: "draft", publishedAt: now }, now)).toBe("draft");
    expect(articleState({ status: "published", publishedAt: "2026-10-05" }, now)).toBe("scheduled");
    expect(articleState({ status: "published", publishedAt: "2026-10-01" }, now)).toBe("live");
  });

  it("keeps jobs live through their deadline day", () => {
    expect(jobState({ status: "published", postedAt: "2026-09-01", deadline: "2026-10-02" }, now)).toBe("live");
    expect(jobState({ status: "published", postedAt: "2026-09-01", deadline: "2026-10-01" }, now)).toBe("expired");
    expect(daysLeft("2026-10-02", now)).toBe(0);
    expect(daysLeft("2026-10-08", now)).toBe(6);
  });
});
