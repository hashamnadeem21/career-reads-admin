"use client";

import { Bold, Heading2, Heading3, ImagePlus, Italic, Link2, List, ListOrdered, Quote, Table } from "lucide-react";
import { forwardRef, useImperativeHandle, useRef, type ReactNode } from "react";
import { Button } from "@/components/admin/Button";
import { Tooltip } from "@/components/admin/Tooltip";
import { MediaPicker } from "@/components/media/MediaPicker";
import { cn } from "@/lib/utils";

export interface MarkdownFieldHandle {
  focus: () => void;
}

type Edit = (text: string, start: number, end: number) => { text: string; start: number; end: number };

const wrap = (before: string, after = before, placeholder = "text"): Edit => (text, start, end) => {
  const selected = text.slice(start, end) || placeholder;
  const next = text.slice(0, start) + before + selected + after + text.slice(end);
  return { text: next, start: start + before.length, end: start + before.length + selected.length };
};

/** Prefixes every selected line (headings, lists, quotes). */
const linePrefix = (prefix: string | ((i: number) => string)): Edit => (text, start, end) => {
  const lineStart = text.lastIndexOf("\n", start - 1) + 1;
  const lineEnd = text.indexOf("\n", end) === -1 ? text.length : text.indexOf("\n", end);
  const block = text.slice(lineStart, lineEnd) || "Text";
  const replaced = block
    .split("\n")
    .map((l, i) => `${typeof prefix === "function" ? prefix(i) : prefix}${l.replace(/^(#{1,6}\s+|>\s+|[-*]\s+|\d+\.\s+)/, "")}`)
    .join("\n");
  return { text: text.slice(0, lineStart) + replaced + text.slice(lineEnd), start: lineStart, end: lineStart + replaced.length };
};

const insertBlock = (snippet: string): Edit => (text, start) => {
  const before = text.slice(0, start);
  const pad = before.length === 0 || before.endsWith("\n\n") ? "" : before.endsWith("\n") ? "\n" : "\n\n";
  const next = `${before}${pad}${snippet}\n\n${text.slice(start)}`;
  const caret = before.length + pad.length + snippet.length;
  return { text: next, start: caret, end: caret };
};

/** Markdown/MDX textarea with a formatting toolbar. Large, calm, readable. */
export const MarkdownField = forwardRef<
  MarkdownFieldHandle,
  { value: string; onChange: (value: string) => void; invalid?: boolean; describedBy?: string; toolbarExtra?: ReactNode }
>(function MarkdownField({ value, onChange, invalid, describedBy, toolbarExtra }, ref) {
  const area = useRef<HTMLTextAreaElement>(null);
  useImperativeHandle(ref, () => ({ focus: () => area.current?.focus() }));

  const apply = (edit: Edit) => {
    const el = area.current;
    if (!el) return;
    const result = edit(value, el.selectionStart, el.selectionEnd);
    onChange(result.text);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(result.start, result.end);
    });
  };

  const tools: { label: string; icon: typeof Bold; edit: Edit; keys?: string }[] = [
    { label: "Heading", icon: Heading2, edit: linePrefix("## ") },
    { label: "Sub-heading", icon: Heading3, edit: linePrefix("### ") },
    { label: "Bold", icon: Bold, edit: wrap("**"), keys: "⌘B" },
    { label: "Italic", icon: Italic, edit: wrap("_"), keys: "⌘I" },
    { label: "Link", icon: Link2, edit: (t, s, e) => wrap("[", "](https://)", "link text")(t, s, e) },
    { label: "Bulleted list", icon: List, edit: linePrefix("- ") },
    { label: "Numbered list", icon: ListOrdered, edit: linePrefix((i) => `${i + 1}. `) },
    { label: "Quote", icon: Quote, edit: linePrefix("> ") },
    { label: "Table", icon: Table, edit: insertBlock("| Column | Column |\n| --- | --- |\n| Cell | Cell |") },
  ];

  return (
    <div className={cn("flex flex-col overflow-hidden rounded-[var(--radius-control)] border bg-[var(--glass-strong)]", invalid ? "border-danger" : "border-divider")}>
      <div role="toolbar" aria-label="Formatting" className="flex flex-wrap items-center gap-0.5 border-b border-divider p-1.5">
        {tools.map((t) => (
          <Tooltip key={t.label} content={t.keys ? `${t.label} (${t.keys})` : t.label} side="top">
            <Button variant="ghost" size="icon-sm" aria-label={t.label} onClick={() => apply(t.edit)}>
              <t.icon />
            </Button>
          </Tooltip>
        ))}
        <MediaPicker
          title="Insert an image"
          onSelect={(img) =>
            apply(insertBlock(`<Figure src="${img.url}" alt="${(img.alt || "Describe this image").replace(/"/g, "'")}" width={${img.width}} height={${img.height}} />`))
          }
          trigger={
            <Button variant="ghost" size="icon-sm" aria-label="Insert image">
              <ImagePlus />
            </Button>
          }
        />
        <div className="ml-auto flex items-center gap-2 pr-1">{toolbarExtra}</div>
      </div>
      <textarea
        ref={area}
        id="body"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (!(e.metaKey || e.ctrlKey)) return;
          if (e.key === "b" || e.key === "i") {
            e.preventDefault();
            apply(e.key === "b" ? wrap("**") : wrap("_"));
          }
        }}
        aria-label="Post body (Markdown)"
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        spellCheck
        placeholder={"Write your post in Markdown.\n\n## Use headings for sections\n\nImages from the Images tab are placed automatically."}
        className="admin-scroll min-h-[60vh] w-full resize-y bg-transparent px-5 py-4 font-mono text-[15px] leading-7 text-ink outline-none placeholder:text-faint focus-visible:shadow-none focus-visible:outline-none"
      />
    </div>
  );
});
