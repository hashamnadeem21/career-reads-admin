import { describe, expect, it } from "vitest";
import { dateInputToIso, jobSlugFrom, parseJobForm, parseQuestionsField } from "@/lib/jobs/form";

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
    expect(parsed.errors?.applyUrl?.[0]).toMatch(/apply link or email, or take applications on Career Reads/);
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

describe("job description", () => {
  const rest = { ...valid, summary: "", responsibilities: [], requirements: [] };

  it("derives the summary from the description", () => {
    const parsed = parseJobForm(form({ ...rest, description: "<p>We are hiring a <strong>frontend developer</strong> for our team.</p>" }));
    expect(parsed.errors).toBeUndefined();
    expect(parsed.data?.summary).toBe("We are hiring a frontend developer for our team.");
    expect(parsed.data?.description).toContain("<strong>frontend developer</strong>");
  });

  it("reports a short description on the description field", () => {
    const parsed = parseJobForm(form({ ...rest, description: "<p>Too short</p>" }));
    expect(parsed.errors?.description).toBeDefined();
    expect(parsed.errors?.summary).toBeUndefined();
  });
});

describe("applications on Career Reads", () => {
  it("lets a job take applications on Career Reads only", () => {
    const parsed = parseJobForm(form({ ...valid, applyEmail: "", onsiteApply: "on" }));
    expect(parsed.errors).toBeUndefined();
    expect(parsed.data).toMatchObject({ onsiteApply: true, applyEmail: undefined, applyUrl: undefined });
  });

  it("checks the questions and keys errors like the API", () => {
    const questions = JSON.stringify([
      { kind: "yes_no", label: "Can you start in May?", required: true },
      { kind: "single_choice", label: "Shift", options: ["Day"] },
      { kind: "short_text", label: "" },
    ]);
    const parsed = parseJobForm(form({ ...valid, onsiteApply: "on", questions }));
    expect(parsed.errors).toMatchObject({
      "questions.1.options": ["Add at least two choices"],
      "questions.2.label": ["Write the question"],
    });
  });
});

describe("parseQuestionsField", () => {
  it("cleans valid questions and survives a broken field", () => {
    expect(parseQuestionsField(JSON.stringify([{ kind: "number", label: "Years of experience?", options: ["x"] }]))).toEqual({
      questions: [{ kind: "number", label: "Years of experience?", options: [], required: false }],
      errors: {},
    });
    expect(parseQuestionsField("{oops").errors.questions).toEqual(["The questions couldn't be read. Reload the page and try again."]);
    expect(parseQuestionsField("").questions).toEqual([]);
  });
});
