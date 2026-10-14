"use client";

import { ImagePlus, X } from "lucide-react";
import { Button } from "@/components/admin/Button";
import { Field, Input } from "@/components/admin/Field";
import { MediaPicker } from "@/components/media/MediaPicker";
import { MarkdownField } from "@/components/posts/MarkdownField";
import type { EmailContent } from "./use-email-editor";

const SUBJECT_MAX = 150;
const PREVIEW_MAX = 200;

const DEFAULT_PLACEHOLDER = `Write your email in Markdown.

## This week on Career Reads

- [A new guide](/blog/your-post) — one line on why it's worth reading
- **5 new remote jobs** in [Engineering](/jobs)

Links to the site can start with / and images come from the media library.`;

/**
 * Subject, inbox preview line, optional banner image, Markdown body and optional button: the
 * fields every subscriber email has. The logo, header and footer come from the email template.
 */
export function EmailFields({
  values,
  errors,
  onChange,
  subjectPlaceholder = "5 remote jobs and a guide to better interviews",
  previewPlaceholder = "This week's picks from Career Reads",
  bodyPlaceholder = DEFAULT_PLACEHOLDER,
  siteOrigin,
}: {
  values: EmailContent;
  errors: Record<string, string>;
  onChange: (key: keyof EmailContent) => (value: string) => void;
  subjectPlaceholder?: string;
  previewPlaceholder?: string;
  bodyPlaceholder?: string;
  siteOrigin: string;
}) {
  // Gmail and Outlook show nothing for SVG images, so say so before anyone sends one.
  const svgInBody = /!\[[^\]]*\]\([^)\s]+\.svg(?:[?#][^)\s]*)?\)/i.test(values.body);
  const heroPreview = values.heroImage.startsWith("/") ? `${siteOrigin}${values.heroImage}` : values.heroImage;
  return (
    <>
      <Field label="Subject" htmlFor="subject" required error={errors.subject} counter={{ value: values.subject.length, max: SUBJECT_MAX }}>
        <Input
          id="subject"
          value={values.subject}
          onChange={(e) => onChange("subject")(e.target.value)}
          invalid={Boolean(errors.subject)}
          placeholder={subjectPlaceholder}
          maxLength={SUBJECT_MAX + 50}
        />
      </Field>
      <Field
        label="Preview text"
        htmlFor="previewText"
        hint="The grey line inboxes show after the subject."
        error={errors.previewText}
        counter={{ value: values.previewText.length, max: PREVIEW_MAX }}
      >
        <Input
          id="previewText"
          value={values.previewText}
          onChange={(e) => onChange("previewText")(e.target.value)}
          invalid={Boolean(errors.previewText)}
          placeholder={previewPlaceholder}
        />
      </Field>
      <div className="flex flex-col gap-1.5">
        <span className="text-[13px] font-medium text-muted">Banner image</span>
        {values.heroImage ? (
          <div className="glass-inset relative overflow-hidden p-1">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={heroPreview} alt="" className="max-h-48 w-full rounded-lg object-cover" />
            <Button
              variant="secondary"
              size="icon-sm"
              aria-label="Remove banner image"
              className="absolute right-3 top-3"
              onClick={() => onChange("heroImage")("")}
            >
              <X />
            </Button>
          </div>
        ) : null}
        <div className="flex items-center gap-3">
          <MediaPicker
            title="Choose a banner image"
            onSelect={(img) => onChange("heroImage")(img.url)}
            trigger={
              <Button variant="secondary" size="sm">
                <ImagePlus /> {values.heroImage ? "Change image" : "Add banner image"}
              </Button>
            }
          />
          <p className="text-xs text-muted">Optional. Shown full width under the logo; 1200×600 works well.</p>
        </div>
        {errors.heroImage ? (
          <p className="text-xs font-medium text-danger">{errors.heroImage}</p>
        ) : (
          /\.svg(\?|#|$)/i.test(values.heroImage) && (
            <p className="text-xs font-medium text-danger">Gmail and Outlook don&apos;t show SVG images. Pick a PNG or JPG.</p>
          )
        )}
      </div>
      <div className="flex flex-col gap-1.5">
        <span className="text-[13px] font-medium text-muted">
          Email <span className="text-danger" aria-hidden>*</span>
        </span>
        <MarkdownField
          value={values.body}
          onChange={onChange("body")}
          invalid={Boolean(errors.body)}
          describedBy={errors.body ? "body-error" : undefined}
          label="Email body (Markdown)"
          placeholder={bodyPlaceholder}
          imageSnippet={(img) => `![${(img.alt || "Image").replace(/[[\]]/g, "")}](${img.url})`}
        />
        {svgInBody && (
          <p className="text-xs font-medium text-danger">
            This email has an SVG image. Gmail and Outlook won&apos;t show it; use a PNG or JPG instead.
          </p>
        )}
        {errors.body && (
          <p id="body-error" className="text-xs font-medium text-danger" role="alert">
            {errors.body}
          </p>
        )}
      </div>
      <div className="grid gap-4 sm:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <Field label="Button text" htmlFor="ctaLabel" error={errors.ctaLabel} counter={{ value: values.ctaLabel.length, max: 40 }}>
          <Input
            id="ctaLabel"
            value={values.ctaLabel}
            onChange={(e) => onChange("ctaLabel")(e.target.value)}
            invalid={Boolean(errors.ctaLabel)}
            placeholder="Browse jobs"
          />
        </Field>
        <Field label="Button link" htmlFor="ctaUrl" error={errors.ctaUrl} hint="Optional. A site path like /jobs or a full https:// link.">
          <Input
            id="ctaUrl"
            value={values.ctaUrl}
            onChange={(e) => onChange("ctaUrl")(e.target.value)}
            invalid={Boolean(errors.ctaUrl)}
            placeholder="/jobs"
            inputMode="url"
          />
        </Field>
      </div>
    </>
  );
}
