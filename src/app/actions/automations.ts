"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { apiFetch } from "@/lib/api/client";
import type { AutomationRow } from "@/lib/api/types";
import { type ActionResult, toResult } from "@/lib/api/results";
import { requireStaff, requireSuperAdmin } from "@/lib/auth/require-user";

/**
 * Automation actions. Staff write and test automations; only super admins switch them on or off
 * and retry failures (the API enforces both). The API validates every field.
 */

const id = z.number().int().positive();
const path = (automationId: number, action = "") => `/automations/${id.parse(automationId)}${action ? `/${action}` : ""}`;

export interface AutomationInput {
  name: string;
  trigger: "subscribed";
  delayMinutes: number;
  subject: string;
  previewText: string;
  body: string;
  heroImage: string;
  ctaLabel: string;
  ctaUrl: string;
  /** ISO, worked out in the browser so dates mean the admin's local time. */
  startsAt: string | null;
  endsAt: string | null;
}

const inputSchema = z.object({
  name: z.string().max(1000),
  trigger: z.literal("subscribed"),
  delayMinutes: z.number().int(),
  subject: z.string().max(1000),
  previewText: z.string().max(1000),
  body: z.string().max(200_000),
  heroImage: z.string().max(1000),
  ctaLabel: z.string().max(1000),
  ctaUrl: z.string().max(1000),
  startsAt: z.iso.datetime().nullable(),
  endsAt: z.iso.datetime().nullable(),
});

function refresh(automationId?: number) {
  revalidatePath("/automations");
  if (automationId) revalidatePath(`/automations/${automationId}`);
}

/** Creates (`automationId` null) or saves one. Returns the id so a new one gets its own URL. */
export async function saveAutomation(
  automationId: number | null,
  input: AutomationInput,
): Promise<ActionResult & { id?: number }> {
  await requireStaff();
  const body = inputSchema.parse(input);
  let savedId: number | undefined;
  const result = await toResult(async () => {
    const saved = await apiFetch<{ message: string; automation: AutomationRow }>(
      automationId ? path(automationId) : "/automations",
      { method: automationId ? "PATCH" : "POST", body },
    );
    savedId = saved.automation.id;
    return saved;
  });
  if (result.ok) refresh(savedId);
  return { ...result, id: savedId };
}

export async function deleteAutomation(automationId: number): Promise<ActionResult> {
  await requireStaff();
  const result = await toResult(() => apiFetch(path(automationId), { method: "DELETE" }), "Automation deleted.");
  if (result.ok) refresh();
  return result;
}

/** Switches it on (new triggers queue emails) or off (waiting emails are skipped). */
export async function setAutomationActive(automationId: number, active: boolean): Promise<ActionResult> {
  await requireSuperAdmin();
  const result = await toResult(() =>
    apiFetch(path(automationId, "status"), { method: "POST", body: { active: z.boolean().parse(active) } }),
  );
  refresh(automationId);
  return result;
}

/** Sends the saved email to one address (the signed-in user's when blank). */
export async function sendTestAutomation(automationId: number, email: string): Promise<ActionResult> {
  await requireStaff();
  const to = z.union([z.literal(""), z.email()]).safeParse(email.trim());
  if (!to.success) return { ok: false, message: "Enter a valid email.", errors: { email: "Enter a valid email" } };
  return toResult(() =>
    apiFetch(path(automationId, "test"), { method: "POST", body: to.data ? { email: to.data } : {} }),
  );
}

/** Queues the emails that failed for good to be tried again within a minute. */
export async function retryAutomation(automationId: number): Promise<ActionResult> {
  await requireSuperAdmin();
  const result = await toResult(() => apiFetch(path(automationId, "retry"), { method: "POST" }));
  refresh(automationId);
  return result;
}
