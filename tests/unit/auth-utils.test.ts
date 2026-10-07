import { describe, expect, it } from "vitest";
import { slugify, timeAgo } from "@/lib/utils";

describe("utils", () => {
  it("slugifies titles", () => {
    expect(slugify("Frontend Developer (React / Next.js) — Example Co")).toBe("frontend-developer-react-next-js-example-co");
    expect(slugify("Café & Crème")).toBe("cafe-and-creme");
  });

  it("formats relative times", () => {
    const now = new Date("2026-10-02T12:00:00Z");
    expect(timeAgo(new Date("2026-10-02T10:00:00Z"), now)).toBe("2h ago");
    expect(timeAgo(new Date("2026-09-29T12:00:00Z"), now)).toBe("3d ago");
  });
});
