/** The parts every email to subscribers has: newsletters and automations alike. */
export interface EmailContent {
  subject: string;
  previewText: string;
  body: string;
  /** Banner image above the body (media library URL). Empty = none. */
  heroImage: string;
  /** Button after the body; shown when `ctaUrl` is set. */
  ctaLabel: string;
  ctaUrl: string;
}

export const EMAIL_EXTRAS = { heroImage: "", ctaLabel: "", ctaUrl: "" } as const;

/** The email fields of a saved newsletter or automation. */
export function emailContentOf(row: EmailContent): EmailContent {
  const { subject, previewText, body, heroImage, ctaLabel, ctaUrl } = row;
  return { subject, previewText, body, heroImage, ctaLabel, ctaUrl };
}
