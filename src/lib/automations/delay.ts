import type { AutomationTrigger } from "@/lib/api/types";

/** Automation delays are stored in minutes; the form shows them as an amount and a unit. */
export type DelayUnit = "minutes" | "hours" | "days";

const MINUTES: Record<DelayUnit, number> = { minutes: 1, hours: 60, days: 1440 };

/** 4320 → { amount: 3, unit: "days" }; the biggest unit that divides evenly. */
export function splitDelay(minutes: number): { amount: number; unit: DelayUnit } {
  if (minutes > 0 && minutes % MINUTES.days === 0) return { amount: minutes / MINUTES.days, unit: "days" };
  if (minutes > 0 && minutes % MINUTES.hours === 0) return { amount: minutes / MINUTES.hours, unit: "hours" };
  return { amount: minutes, unit: "minutes" };
}

export function joinDelay(amount: number, unit: DelayUnit): number {
  return Math.round(amount * MINUTES[unit]);
}

/** "straight away", "1 hour after", "3 days after". */
export function describeDelay(minutes: number): string {
  if (minutes <= 0) return "straight away";
  const { amount, unit } = splitDelay(minutes);
  return `${amount} ${amount === 1 ? unit.slice(0, -1) : unit} after`;
}

export const TRIGGER_LABELS: Record<AutomationTrigger, string> = {
  subscribed: "Someone subscribes to the newsletter",
  candidate_signed_up: "A candidate creates an account",
};

/** "When someone subscribes · straight away" style summary of an automation's trigger. */
export function describeTrigger(trigger: AutomationTrigger, delayMinutes: number): string {
  const when = trigger === "subscribed" ? "someone subscribes" : "a candidate creates an account";
  return delayMinutes <= 0 ? `Straight away when ${when}` : `${capitalise(describeDelay(delayMinutes))} ${when}`;
}

function capitalise(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}
