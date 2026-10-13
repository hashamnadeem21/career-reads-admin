"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { ApiError, apiFetch } from "@/lib/api/client";
import type { NewsletterRow } from "@/lib/api/types";
import { type ActionResult, toResult } from "@/lib/api/results";
import { requireStaff, requireSuperAdmin } from "@/lib/auth/require-user";

/**
 * Newsletter actions. Any staff member can write drafts and send themselves a test; sending and
 * scheduling are for super admins (the API enforces both). The API validates every field.
 */

const id = z.number().int().positive();
const path = (newsletterId: number, action = "") => `/newsletters/${id.parse(newsletterId)}${action ? `/${action}` : ""}`;

export interface NewsletterInput {
  subject: string;
  previewText: string;
  body: string;
}

/** Active subscribers who signed up in [from, to) (ISO, worked out in the browser). Both null = everyone. */
export interface AudienceInput {
  from: string | null;
  to: string | null;
}

const audienceSchema = z.object({ from: z.iso.datetime().nullable(), to: z.iso.datetime().nullable() });

const inputSchema = z.object({
  subject: z.string().max(1000),
  previewText: z.string().max(1000),
  body: z.string().max(200_000),
});

function refresh(newsletterId?: number) {
  revalidatePath("/newsletters");
  if (newsletterId) revalidatePath(`/newsletters/${newsletterId}`);
}

/** Creates a draft (`newsletterId` null) or saves one. Returns the id so a new draft gets its own URL. */
export async function saveNewsletter(
  newsletterId: number | null,
  input: NewsletterInput,
): Promise<ActionResult & { id?: number }> {
  await requireStaff();
  const body = inputSchema.parse(input);
  let savedId: number | undefined;
  const result = await toResult(async () => {
    const saved = await apiFetch<{ message: string; newsletter: NewsletterRow }>(
      newsletterId ? path(newsletterId) : "/newsletters",
      { method: newsletterId ? "PATCH" : "POST", body },
    );
    savedId = saved.newsletter.id;
    return saved;
  });
  if (result.ok) refresh(savedId);
  return { ...result, id: savedId };
}

export async function deleteNewsletter(newsletterId: number): Promise<ActionResult> {
  await requireStaff();
  const result = await toResult(() => apiFetch(path(newsletterId), { method: "DELETE" }), "Newsletter deleted.");
  if (result.ok) refresh();
  return result;
}

/** Sends the saved draft to one address (the signed-in user's when blank). */
export async function sendTestNewsletter(newsletterId: number, email: string): Promise<ActionResult> {
  await requireStaff();
  const to = z.union([z.literal(""), z.email()]).safeParse(email.trim());
  if (!to.success) return { ok: false, message: "Enter a valid email.", errors: { email: "Enter a valid email" } };
  return toResult(() =>
    apiFetch(path(newsletterId, "test"), { method: "POST", body: to.data ? { email: to.data } : {} }),
  );
}

/** How many active subscribers are in an audience, for the send dialog. */
export async function countAudience(audience: AudienceInput): Promise<number | null> {
  await requireStaff();
  const parsed = audienceSchema.safeParse(audience);
  if (!parsed.success) return null;
  const query = new URLSearchParams();
  if (parsed.data.from) query.set("from", parsed.data.from);
  if (parsed.data.to) query.set("to", parsed.data.to);
  try {
    const { count } = await apiFetch<{ count: number }>(`/newsletters/audience?${query}`);
    return count;
  } catch (error) {
    if (error instanceof ApiError) return null;
    throw error;
  }
}

/** Sends now to the audience. The API delivers in the background; the page shows progress. */
export async function sendNewsletter(newsletterId: number, audience: AudienceInput): Promise<ActionResult> {
  await requireSuperAdmin();
  const body = { audience: audienceSchema.parse(audience) };
  const result = await toResult(() => apiFetch(path(newsletterId, "send"), { method: "POST", body }));
  refresh(newsletterId);
  return result;
}

/** Sends automatically at `sendAt` (ISO) to the audience. Rescheduling works the same way. */
export async function scheduleNewsletter(newsletterId: number, sendAt: string, audience: AudienceInput): Promise<ActionResult> {
  await requireSuperAdmin();
  const body = { sendAt: z.iso.datetime().parse(sendAt), audience: audienceSchema.parse(audience) };
  const result = await toResult(() => apiFetch(path(newsletterId, "schedule"), { method: "POST", body }));
  refresh(newsletterId);
  return result;
}

/** Takes a scheduled newsletter back to a draft. */
export async function unscheduleNewsletter(newsletterId: number): Promise<ActionResult> {
  await requireSuperAdmin();
  const result = await toResult(() => apiFetch(path(newsletterId, "schedule"), { method: "DELETE" }));
  refresh(newsletterId);
  return result;
}

/** Tries a sent newsletter's failed emails again. */
export async function retryNewsletter(newsletterId: number): Promise<ActionResult> {
  await requireSuperAdmin();
  const result = await toResult(() => apiFetch(path(newsletterId, "retry"), { method: "POST" }));
  refresh(newsletterId);
  return result;
}

/** The email as subscribers will see it, for the editor's live preview. */
export async function previewNewsletter(input: NewsletterInput): Promise<{ html: string } | { error: string }> {
  await requireStaff();
  try {
    return await apiFetch<{ html: string }>("/newsletters/preview", { method: "POST", body: inputSchema.parse(input) });
  } catch (error) {
    if (error instanceof ApiError) return { error: error.message };
    throw error;
  }
}
