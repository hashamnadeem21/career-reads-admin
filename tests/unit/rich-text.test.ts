import { describe, expect, it } from "vitest";
import { plainTextToHtml } from "@/components/admin/RichTextEditor";

describe("plainTextToHtml", () => {
  it("turns pasted bullet and numbered lines into lists", () => {
    expect(plainTextToHtml("About the role\nWe build apps.\n\nRequirements:\n• React\n• Node & SQL\n1. Apply\n2. Interview")).toBe(
      "<p>About the role<br>We build apps.</p><p>Requirements:</p><ul><li><p>React</p></li><li><p>Node &amp; SQL</p></li></ul><ol><li><p>Apply</p></li><li><p>Interview</p></li></ol>",
    );
  });
});
