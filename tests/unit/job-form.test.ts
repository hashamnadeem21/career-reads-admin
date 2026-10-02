import { describe, expect, it } from "vitest";
import { dateInputToIso, jobSlugFrom, parseJobForm } from "@/lib/jobs/form";

function form(values: Record<string, string | string[]>) {
  const fd = new FormData();
  for (const [k, v] of Object.entries(values)) for (const item of [v].flat()) fd.append(k, item);
  return fd;
}

const valid = {
  title: "Frontend Developer",
  company: "Example Co",
  country: "Pakistan",
  workModel: "remote",
  employmentType: "full-time",
  category: "software-it",
  experience: "mid",
  summary: "Build accessible interfaces with React and Next.js for a product team.",
  responsibilities: ["Build user interfaces", "", "Review code"],
  requirements: ["2+ years of React"],
  applyEmail: "jobs@example.com",
  applyUrl: "",
  postedAt: "2026-10-01",
  deadline: "2026-12-31",
  status: "published",
  featured: "on",
};

describe("parseJobForm", () => {
  it("builds a jobSchema object, dropping empty list items", () => {
    const parsed = parseJobForm(form(valid));
    expect(parsed.errors).toBeUndefined();
    expect(parsed.slug).toBe("frontend-developer-example-co");
    expect(parsed.data).toMatchObject({
      responsibilities: ["Build user interfaces", "Review code"],
      postedAt: "2026-10-01T00:00:00.000Z",
      featured: true,
      status: "published",
      sample: false,
    });
    expect(parsed.data?.applyUrl).toBeUndefined();
  });

  it("requires a way to apply", () => {
    const parsed = parseJobForm(form({ ...valid, applyEmail: "" }));
    expect(parsed.errors?.applyUrl?.[0]).toMatch(/applyUrl or an applyEmail/);
  });

  it("rejects a deadline before the posted date and bad slugs", () => {
    const parsed = parseJobForm(form({ ...valid, deadline: "2026-09-01", slug: "Bad Slug!" }));
    expect(parsed.errors?.deadline).toBeDefined();
    expect(parsed.errors?.slug).toBeDefined();
    expect(parsed.values.title).toBe("Frontend Developer");
  });

  it("keeps the original slug for edits", () => {
    expect(parseJobForm(form({ ...valid, slug: "custom-slug", originalSlug: "old-slug" }))).toMatchObject({ slug: "custom-slug", originalSlug: "old-slug" });
  });
});

describe("helpers", () => {
  it("converts date inputs to UTC midnight", () => {
    expect(dateInputToIso("2026-10-02")).toBe("2026-10-02T00:00:00.000Z");
    expect(dateInputToIso("")).toBeUndefined();
  });
  it("makes slugs from title and company", () => {
    expect(jobSlugFrom("UI/UX Designer", "Acme & Sons")).toBe("ui-ux-designer-acme-and-sons");
  });
});
