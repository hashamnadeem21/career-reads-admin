import { describe, expect, it } from "vitest";
import { checkDraft, resolvePublishing, type PostDraft } from "@/lib/posts/draft";
import { buildOutline, placementOptions } from "@/lib/posts/outline";

const body = `Intro paragraph that sets things up.

## First section

Text.

## Second section

### A detail

More.

## Conclusion

Bye.`;

const draft = (over: Partial<PostDraft> = {}): PostDraft => ({
  originalSlug: null,
  slug: "a-good-post",
  title: "A perfectly good post title",
  excerpt: "An excerpt that is comfortably longer than the fifty character minimum.",
  body,
  category: "technology",
  tags: ["Testing"],
  author: "editorial-team",
  coverImage: "/uploads/hero.webp",
  coverAlt: "A descriptive hero image",
  coverWidth: 1600,
  coverHeight: 900,
  images: [],
  seoTitle: "",
  seoDescription: "",
  canonicalUrl: "",
  noindex: false,
  ads: true,
  featured: false,
  trending: false,
  editorsPick: false,
  status: "draft",
  publishedAt: "",
  ...over,
});

const now = new Date("2026-10-02T12:00:00Z");

describe("resolvePublishing", () => {
  it("publishes now, keeping the original date for already-live posts", () => {
    expect(resolvePublishing({ status: "draft", publishedAt: "" }, "publish", now)).toEqual({ status: "published", publishedAt: now });
    const old = "2026-01-01T00:00:00.000Z";
    expect(resolvePublishing({ status: "published", publishedAt: old }, "publish", now)).toEqual({ status: "published", publishedAt: new Date(old) });
  });

  it("only schedules into the future", () => {
    expect(resolvePublishing({ status: "draft", publishedAt: "" }, "schedule", now, "2026-10-01T00:00:00Z")).toHaveProperty("error");
    expect(resolvePublishing({ status: "draft", publishedAt: "" }, "schedule", now, "2026-10-09T09:00:00Z")).toEqual({
      status: "published",
      publishedAt: new Date("2026-10-09T09:00:00Z"),
    });
  });

  it("unpublish and autosave produce drafts", () => {
    expect(resolvePublishing({ status: "published", publishedAt: now.toISOString() }, "unpublish", now)).toMatchObject({ status: "draft" });
    expect(resolvePublishing({ status: "draft", publishedAt: "" }, "autosave", now)).toMatchObject({ status: "draft" });
  });
});

describe("checkDraft", () => {
  it("accepts a complete post and lowercases tags like the site", () => {
    const result = checkDraft(draft(), { status: "draft", publishedAt: now });
    expect(result.errors).toEqual({});
    expect(result.data?.tags).toEqual(["testing"]);
  });

  it("reports nested image errors by path", () => {
    const result = checkDraft(
      draft({ images: [{ src: "/uploads/x.webp", alt: "short", caption: "", width: 10, height: 10, placement: "middle" }], coverImage: "" }),
      { status: "draft", publishedAt: now },
    );
    expect(result.errors["images.0.alt"]).toBeDefined();
    expect(result.errors.coverImage).toBe("Choose a hero image");
    expect(result.data).toBeUndefined();
  });

  it("flags images under a heading that no longer exists", () => {
    const result = checkDraft(
      draft({ images: [{ src: "/uploads/x.webp", alt: "A descriptive alt text", caption: "", width: 10, height: 10, placement: "section:gone" }] }),
      { status: "draft", publishedAt: now },
    );
    expect(result.missingSections).toEqual([0]);
  });
});

describe("image placement", () => {
  it("offers fixed spots and every ## / ### heading", () => {
    const values = placementOptions(body).map((o) => o.value);
    expect(values).toEqual(["after-intro", "middle", "before-conclusion", "section:first-section", "section:second-section", "section:a-detail", "section:conclusion"]);
  });

  it("puts images in the outline exactly where the site injects them", () => {
    const outline = buildOutline(body, [{ placement: "after-intro" }, { placement: "section:a-detail" }, { placement: "before-conclusion" }]);
    expect(outline.map((o) => (o.kind === "image" ? `[${o.imageIndex}]` : o.text))).toEqual([
      "Intro",
      "[0]",
      "First section",
      "Second section",
      "A detail",
      "[1]",
      "[2]",
      "Conclusion",
    ]);
  });
});

describe("checkMdxBody", async () => {
  const { checkMdxBody } = await import("@/lib/posts/mdx-check");
  it("accepts normal Markdown with site components", async () => {
    expect(await checkMdxBody('## Heading\n\n<Callout type="tip">Hi</Callout>\n\n<Figure src="/a.png" alt="An image" width={10} height={10} />')).toBeNull();
  });
  it("rejects code and broken syntax with a readable message", async () => {
    expect(await checkMdxBody("Secret: {process.env.DATABASE_URL}")).toMatch(/Curly-brace/);
    expect(await checkMdxBody("<Callout>unclosed")).toMatch(/formatting problem/);
  });
});
