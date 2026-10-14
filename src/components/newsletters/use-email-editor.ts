"use client";

import { useEffect, useEffectEvent, useRef, useState } from "react";
import { previewNewsletter } from "@/app/actions/newsletters";
import { emailContentOf, type EmailContent } from "@/lib/newsletters/email-content";

export type { EmailContent };

const PREVIEW_DELAY_MS = 400;

/**
 * Live preview, rendered by the API so it matches the real email exactly. `pending` is true while
 * the preview shows an older edit than `content`.
 */
export function useLivePreview(content: EmailContent, initial: { content: EmailContent; html: string | null }) {
  const [preview, setPreview] = useState<{ html: string | null; error: string | null; renderedFor: string | null }>({
    html: initial.html,
    error: null,
    renderedFor: initial.html === null ? null : key(initial.content),
  });
  const current = key(content);
  const latest = useRef(0);

  useEffect(() => {
    if (current === preview.renderedFor) return;
    const request = ++latest.current;
    const timer = setTimeout(async () => {
      const result = await previewNewsletter(JSON.parse(current) as EmailContent);
      if (request !== latest.current) return;
      setPreview((p) =>
        "html" in result ? { html: result.html, error: null, renderedFor: current } : { ...p, error: result.error, renderedFor: current },
      );
    }, PREVIEW_DELAY_MS);
    return () => clearTimeout(timer);
  }, [current, preview.renderedFor]);

  return { html: preview.html, error: preview.error, pending: preview.renderedFor !== current };
}

function key(content: EmailContent): string {
  return JSON.stringify(emailContentOf(content));
}

/** Asks before leaving the page with unsaved changes. */
export function useUnsavedWarning(dirty: boolean): void {
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
}

/** ⌘S / Ctrl+S runs `save`. */
export function useSaveShortcut(save: () => void): void {
  const onSave = useEffectEvent(save);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        onSave();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
}
