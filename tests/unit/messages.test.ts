import { describe, expect, it } from "vitest";
import { dayGroup, groupByDay, type InboxMessage, matchesQuery, replyMailto, replyTemplates } from "@/lib/messages/inbox";

const msg = (over: Partial<InboxMessage> = {}): InboxMessage => ({
  id: 1,
  name: "Ayesha Khan",
  email: "ayesha@example.com",
  topic: "correction",
  message: "The salary on the React job is wrong.\nIt says 5k.",
  read: false,
  createdAt: "2026-10-13T09:00:00Z",
  ...over,
});

const now = new Date("2026-10-13T18:00:00Z");

describe("inbox helpers", () => {
  it("groups messages by UTC day, keeping order", () => {
    expect(dayGroup("2026-10-13T00:01:00Z", now)).toBe("Today");
    expect(dayGroup("2026-10-12T23:59:00Z", now)).toBe("Yesterday");
    expect(dayGroup("2026-10-08T12:00:00Z", now)).toBe("This week");
    expect(dayGroup("2026-10-01T12:00:00Z", now)).toBe("Earlier");

    const groups = groupByDay(
      [msg({ id: 1 }), msg({ id: 2, createdAt: "2026-10-13T01:00:00Z" }), msg({ id: 3, createdAt: "2026-09-01T00:00:00Z" })],
      now,
    );
    expect(groups.map((g) => [g.label, g.items.map((m) => m.id)])).toEqual([
      ["Today", [1, 2]],
      ["Earlier", [3]],
    ]);
  });

  it("searches name, email, topic and text, ignoring case", () => {
    expect(matchesQuery(msg(), "")).toBe(true);
    expect(matchesQuery(msg(), "AYESHA")).toBe(true);
    expect(matchesQuery(msg(), "example.com")).toBe(true);
    expect(matchesQuery(msg(), "correction")).toBe(true);
    expect(matchesQuery(msg(), "salary")).toBe(true);
    expect(matchesQuery(msg(), "invoice")).toBe(false);
  });

  it("offers topic-specific reply templates addressed by first name", () => {
    const labels = replyTemplates(msg()).map((t) => t.label);
    expect(labels).toContain("Fixed");
    expect(labels).not.toContain("Ask for details");
    expect(replyTemplates(msg({ topic: "advertising" })).map((t) => t.label)).toContain("Ask for details");
    expect(replyTemplates(msg())[0]?.text).toMatch(/^Hi Ayesha,/);
  });

  it("builds a mailto link with the draft and their message quoted", () => {
    const url = replyMailto(msg(), "Thanks, fixed!");
    expect(url.startsWith("mailto:ayesha@example.com?subject=")).toBe(true);
    const params = new URLSearchParams(url.split("?")[1]);
    expect(params.get("subject")).toBe("Re: your message to Career Reads (correction)");
    expect(params.get("body")).toBe(
      "Thanks, fixed!\n\nOn 13 Oct 2026, Ayesha Khan wrote:\n> The salary on the React job is wrong.\n> It says 5k.",
    );
  });

  it("shortens very long originals in the quote", () => {
    const body = new URLSearchParams(replyMailto(msg({ message: "x".repeat(2000) }), "").split("?")[1]).get("body") ?? "";
    expect(body.length).toBeLessThan(700);
    expect(body.endsWith("…")).toBe(true);
  });
});
