import { describe, expect, it } from "vitest";
import { candidateFilterQuery, parseCandidateListParams } from "@/lib/candidates/queries";

describe("candidate list filters", () => {
  it("keeps only valid filters", () => {
    expect(
      parseCandidateListParams({ q: "  sara ", method: "google", subscribed: "yes", from: "2026-10-01", to: "nope", page: "2" }),
    ).toEqual({ q: "sara", method: "google", subscribed: "yes", from: "2026-10-01", to: undefined, page: 2 });
    expect(parseCandidateListParams({ method: "apply", subscribed: "maybe", page: "-3" })).toEqual({
      q: undefined,
      method: undefined,
      subscribed: undefined,
      from: undefined,
      to: undefined,
      page: 1,
    });
  });

  it("builds the CSV link from the same filters, without the page", () => {
    expect(candidateFilterQuery({ q: "sara khan", method: "password", page: 3 })).toBe("?q=sara+khan&method=password");
    expect(candidateFilterQuery({ page: 1 })).toBe("");
  });
});
