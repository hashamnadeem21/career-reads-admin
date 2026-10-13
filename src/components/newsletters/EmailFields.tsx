"use client";

import { Field, Input } from "@/components/admin/Field";
import { MarkdownField } from "@/components/posts/MarkdownField";
import type { EmailContent } from "./use-email-editor";

const SUBJECT_MAX = 150;
const PREVIEW_MAX = 200;

const DEFAULT_PLACEHOLDER = `Write your email in Markdown.

## This week on Career Reads

- [A new guide](/blog/your-post) — one line on why it's worth reading
- **5 new remote jobs** in [Engineering](/jobs)

Links to the site can start with / and images come from the media library.`;

/** Subject, inbox preview line and Markdown body: the fields every subscriber email has. */
export function EmailFields({
  values,
  errors,
  onChange,
  subjectPlaceholder = "5 remote jobs and a guide to better interviews",
  previewPlaceholder = "This week's picks from Career Reads",
  bodyPlaceholder = DEFAULT_PLACEHOLDER,
}: {
  values: EmailContent;
  errors: Record<string, string>;
  onChange: (key: keyof EmailContent) => (value: string) => void;
  subjectPlaceholder?: string;
  previewPlaceholder?: string;
  bodyPlaceholder?: string;
}) {
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
        {errors.body && (
          <p id="body-error" className="text-xs font-medium text-danger" role="alert">
            {errors.body}
          </p>
        )}
      </div>
    </>
  );
}
