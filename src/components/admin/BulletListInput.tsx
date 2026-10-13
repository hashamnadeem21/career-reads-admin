"use client";

import { useEffect, useRef, useState, type ClipboardEvent, type KeyboardEvent } from "react";
import { controlClasses } from "./Field";
import { cn } from "@/lib/utils";

/** "- ", "• ", "* ", "1. ", "2) " etc. at the start of a pasted line. */
const MARKER = /^\s*(?:[-*•‣◦▪●–—]|\d+[.)])\s+/;

const cleanLine = (line: string) => line.replace(MARKER, "").trim();

/**
 * A bullet list you type into like a document: Enter starts a new point, Backspace at the start
 * of a point joins it to the one above, and pasting a list splits it into points.
 * Submits one input per point, named `name` (empty points are dropped when the form is parsed).
 */
export function BulletListInput({
  name,
  label,
  defaultValue = [],
  max = 20,
  maxLength = 300,
  placeholder,
  onChange,
  invalid,
}: {
  name: string;
  /** Singular, e.g. "Responsibility". Each point is labelled "Responsibility 1", "Responsibility 2"… */
  label: string;
  defaultValue?: string[];
  max?: number;
  maxLength?: number;
  placeholder?: string;
  onChange?: (items: string[]) => void;
  invalid?: boolean;
}) {
  const initial = defaultValue.length ? defaultValue : [""];
  const nextKey = useRef(initial.length);
  const [items, setItems] = useState(() => initial.map((text, i) => ({ key: i, text })));
  const fields = useRef(new Map<number, HTMLTextAreaElement>());
  const pendingFocus = useRef<{ key: number; caret: number } | null>(null);

  const commit = (next: typeof items, focus?: { index: number; caret: number }) => {
    if (focus) pendingFocus.current = { key: next[focus.index].key, caret: focus.caret };
    setItems(next);
    onChange?.(next.map((i) => i.text));
  };

  const focusAt = (key: number, caret: number) => {
    const el = fields.current.get(key);
    el?.focus();
    el?.setSelectionRange(caret, caret);
  };

  useEffect(() => {
    const focus = pendingFocus.current;
    if (!focus) return;
    pendingFocus.current = null;
    focusAt(focus.key, focus.caret);
  });

  // Grow each point to fit its text (no scrollbars inside the list).
  useEffect(() => {
    for (const el of fields.current.values()) {
      el.style.height = "auto";
      el.style.height = `${el.scrollHeight}px`;
    }
  }, [items]);

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>, index: number) => {
    if (e.nativeEvent.isComposing) return;
    const el = e.currentTarget;
    const { selectionStart: start, selectionEnd: end, value } = el;
    const collapsed = start === end;

    if (e.key === "Enter") {
      e.preventDefault();
      if (items.length >= max) return;
      const next = [...items];
      next[index] = { ...next[index], text: value.slice(0, start) };
      next.splice(index + 1, 0, { key: nextKey.current++, text: value.slice(end) });
      commit(next, { index: index + 1, caret: 0 });
    } else if (e.key === "Backspace" && collapsed && start === 0 && index > 0) {
      e.preventDefault();
      const prev = items[index - 1];
      const next = [...items];
      next[index - 1] = { ...prev, text: prev.text + value };
      next.splice(index, 1);
      commit(next, { index: index - 1, caret: prev.text.length });
    } else if (e.key === "Delete" && collapsed && start === value.length && index < items.length - 1) {
      e.preventDefault();
      const next = [...items];
      next[index] = { ...next[index], text: value + items[index + 1].text };
      next.splice(index + 1, 1);
      commit(next, { index, caret: value.length });
    } else if (e.key === "ArrowUp" && collapsed && start === 0 && index > 0) {
      e.preventDefault();
      focusAt(items[index - 1].key, items[index - 1].text.length);
    } else if (e.key === "ArrowDown" && collapsed && start === value.length && index < items.length - 1) {
      e.preventDefault();
      focusAt(items[index + 1].key, 0);
    }
  };

  const onPaste = (e: ClipboardEvent<HTMLTextAreaElement>, index: number) => {
    const pasted = e.clipboardData.getData("text/plain");
    if (!/\r|\n/.test(pasted)) return;
    e.preventDefault();
    const lines = pasted.split(/\r?\n|\r/).map(cleanLine).filter(Boolean);
    if (!lines.length) return;
    const el = e.currentTarget;
    const before = el.value.slice(0, el.selectionStart);
    const after = el.value.slice(el.selectionEnd);
    const room = max - items.length + 1;
    const kept = lines.slice(0, room);
    kept[0] = before + kept[0];
    const lastIndex = kept.length - 1;
    const caret = kept[lastIndex].length;
    kept[lastIndex] += after;
    const next = [...items];
    next.splice(
      index,
      1,
      ...kept.map((text, i) => (i === 0 ? { ...items[index], text } : { key: nextKey.current++, text })),
    );
    commit(next, { index: index + lastIndex, caret });
  };

  return (
    <div className="flex flex-col gap-1.5">
      <ul
        className={cn(
          controlClasses(invalid),
          "flex cursor-text flex-col gap-1 py-2.5 focus-within:border-link focus-within:shadow-[0_0_0_4px_var(--primary-glow)]",
        )}
        onClick={(e) => {
          // Clicking the empty area below the points focuses the last one.
          if (e.target === e.currentTarget) {
            const last = items[items.length - 1];
            focusAt(last.key, last.text.length);
          }
        }}
      >
        {items.map((item, index) => (
          <li key={item.key} className="flex items-start gap-2.5">
            <span className="select-none pt-px leading-relaxed text-muted" aria-hidden>
              •
            </span>
            <textarea
              ref={(el) => {
                if (el) fields.current.set(item.key, el);
                else fields.current.delete(item.key);
              }}
              name={name}
              rows={1}
              value={item.text}
              maxLength={maxLength}
              aria-label={`${label} ${index + 1}`}
              aria-invalid={(invalid && item.text.trim().length > 0 && item.text.trim().length < 3) || undefined}
              placeholder={index === 0 && items.length === 1 ? placeholder : undefined}
              onChange={(e) =>
                commit(items.map((it) => (it.key === item.key ? { ...it, text: e.target.value.replace(/\r?\n|\r/g, " ") } : it)))
              }
              onKeyDown={(e) => onKeyDown(e, index)}
              onPaste={(e) => onPaste(e, index)}
              className="min-w-0 flex-1 resize-none overflow-hidden bg-transparent leading-relaxed text-ink placeholder:text-faint focus-visible:shadow-none focus-visible:outline-none"
            />
          </li>
        ))}
      </ul>
      <p className="text-xs text-faint">
        Press Enter for a new point. Paste a list to add several at once.{" "}
        <span className="num">
          {items.filter((i) => i.text.trim()).length}/{max}
        </span>
      </p>
    </div>
  );
}
