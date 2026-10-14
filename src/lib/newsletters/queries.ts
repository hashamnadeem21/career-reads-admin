import "server-only";
import type { EmailContent } from "@/lib/newsletters/email-content";
import { apiFetch, apiGetOrNull } from "@/lib/api/client";
import type { NewsletterListRow, NewsletterRow } from "@/lib/api/types";

/** Who a send would reach, and whether the API can send email yet (Resend set up). */
export interface SendingInfo {
  activeSubscribers: number;
  sendingReady: boolean;
}

export function listNewsletters() {
  return apiFetch<SendingInfo & { items: NewsletterListRow[] }>("/newsletters", { dates: true });
}

/** Null when it doesn't exist (the page shows not-found). */
export function getNewsletter(id: number) {
  return apiGetOrNull<
    SendingInfo & { newsletter: NewsletterRow; failures: { error: string | null; count: number }[] }
  >(`/newsletters/${id}`, { dates: true });
}

/** The email HTML for a saved newsletter (first paint of the preview; the editor updates it live). */
export async function renderEmail(input: EmailContent): Promise<string> {
  const { html } = await apiFetch<{ html: string }>("/newsletters/preview", { method: "POST", body: input });
  return html;
}
