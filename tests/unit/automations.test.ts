import { describe, expect, it } from "vitest";
import { describeDelay, describeTrigger, joinDelay, splitDelay } from "@/lib/automations/delay";
import { endOfLocalDay, fromLocalInput, inclusiveEndInput, toLocalDateInput, toLocalInput } from "@/lib/local-time";

describe("automation delays", () => {
  it("splits minutes into the biggest even unit and back", () => {
    expect(splitDelay(0)).toEqual({ amount: 0, unit: "minutes" });
    expect(splitDelay(45)).toEqual({ amount: 45, unit: "minutes" });
    expect(splitDelay(120)).toEqual({ amount: 2, unit: "hours" });
    expect(splitDelay(4320)).toEqual({ amount: 3, unit: "days" });
    expect(splitDelay(1500)).toEqual({ amount: 25, unit: "hours" });
    expect(joinDelay(3, "days")).toBe(4320);
    expect(joinDelay(2, "hours")).toBe(120);
  });

  it("describes the trigger in plain words", () => {
    expect(describeDelay(0)).toBe("straight away");
    expect(describeDelay(60)).toBe("1 hour after");
    expect(describeTrigger("subscribed", 0)).toBe("Straight away when someone subscribes");
    expect(describeTrigger("subscribed", 4320)).toBe("3 days after someone subscribes");
    expect(describeTrigger("candidate_signed_up", 0)).toBe("Straight away when a candidate creates an account");
  });
});

describe("local dates", () => {
  it("round-trips datetime-local values through ISO", () => {
    const iso = fromLocalInput("2026-10-14T09:30");
    expect(iso).not.toBeNull();
    expect(toLocalInput(iso)).toBe("2026-10-14T09:30");
    expect(fromLocalInput("")).toBeNull();
    expect(fromLocalInput("nonsense")).toBeNull();
  });

  it("turns an inclusive date range into [from, to) and back", () => {
    const end = endOfLocalDay("2026-03-31");
    expect(toLocalInput(end)).toBe("2026-04-01T00:00");
    expect(inclusiveEndInput(end)).toBe("2026-03-31");
    expect(toLocalDateInput(fromLocalInput("2026-03-01"))).toBe("2026-03-01");
  });
});
