import { describe, expect, it } from "vitest";
import { mainNav, visibleNav } from "@/components/admin/nav";
import { answerText, APPLICATION_STATUSES, isApplicationStatus, STATUS_LABELS } from "@/lib/applications/types";
import { questionsField, toDrafts } from "@/lib/jobs/form-values";

describe("applications", () => {
  it("writes answers as text", () => {
    expect(answerText(true)).toBe("Yes");
    expect(answerText(false)).toBe("No");
    expect(answerText(["Go", "Rust"])).toBe("Go, Rust");
    expect(answerText(4)).toBe("4");
    expect(answerText(null)).toBe("Not answered");
  });

  it("labels every status the API knows", () => {
    for (const s of APPLICATION_STATUSES) expect(STATUS_LABELS[s]).toBeTruthy();
    expect(isApplicationStatus("hired")).toBe(true);
    expect(isApplicationStatus("deleted")).toBe(false);
  });

  it("shows Applicants to every role, companies included", () => {
    for (const role of ["super_admin", "editor", "company"] as const)
      expect(visibleNav(mainNav, role).map((e) => e.href)).toContain("/applications");
  });

  it("round-trips saved questions through the builder without React keys", () => {
    const drafts = toDrafts([{ id: "a1b2", kind: "yes_no", label: "Relocate?", options: [], required: true }]);
    expect(drafts[0]).toMatchObject({ key: "a1b2", helpText: "" });
    expect(JSON.parse(questionsField(drafts))).toEqual([
      { id: "a1b2", kind: "yes_no", label: "Relocate?", helpText: "", options: [], required: true },
    ]);
  });
});
