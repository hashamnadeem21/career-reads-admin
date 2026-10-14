"use client";

import { Placeholder } from "@tiptap/extensions";
import { DOMParser as ProseMirrorParser } from "@tiptap/pm/model";
import { EditorContent, useEditor, useEditorState, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import {
  Bold,
  Heading2,
  Heading3,
  Italic,
  Link2,
  List,
  ListOrdered,
  Quote,
  Redo2,
  RemoveFormatting,
  Strikethrough,
  Underline,
  Undo2,
  Unlink,
  type LucideIcon,
} from "lucide-react";
import { useState } from "react";
import { controlClasses } from "./Field";
import { cn } from "@/lib/utils";

/** "- ", "• ", "* " etc. starts a bullet; "1. " / "2) " starts a numbered point. */
const BULLET = /^\s*[-*•‣◦▪●–—]\s+/;
const NUMBER = /^\s*\d+[.)]\s+/;

const escapeHtml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/**
 * Plain text pasted from a PDF, WhatsApp or a text file: blank lines split paragraphs and
 * "•"/"-"/"1." lines become real lists, so a job ad keeps its shape without any HTML.
 */
export function plainTextToHtml(text: string): string {
  const out: string[] = [];
  let list = null as { tag: "ul" | "ol"; items: string[] } | null;
  let paragraph: string[] = [];
  const flushParagraph = () => {
    if (paragraph.length) out.push(`<p>${paragraph.map(escapeHtml).join("<br>")}</p>`);
    paragraph = [];
  };
  const flushList = () => {
    if (list) out.push(`<${list.tag}>${list.items.map((i) => `<li><p>${escapeHtml(i)}</p></li>`).join("")}</${list.tag}>`);
    list = null;
  };
  for (const raw of text.replace(/\r\n?/g, "\n").split("\n")) {
    const line = raw.trim();
    const tag = BULLET.test(line) ? "ul" : NUMBER.test(line) ? "ol" : null;
    if (!line) {
      flushParagraph();
      flushList();
    } else if (tag) {
      flushParagraph();
      if (list?.tag !== tag) flushList();
      list ??= { tag, items: [] };
      list.items.push(line.replace(tag === "ul" ? BULLET : NUMBER, ""));
    } else {
      flushList();
      paragraph.push(line);
    }
  }
  flushParagraph();
  flushList();
  return out.join("");
}

/** "example.com" → "https://example.com", "jobs@x.com" → "mailto:jobs@x.com". */
function normalizeUrl(input: string): string {
  const url = input.trim();
  if (!url || /^(https?:|mailto:|tel:)/i.test(url)) return url;
  if (/^[^\s@/]+@[^\s@/]+\.[^\s@/]+$/.test(url)) return `mailto:${url}`;
  return `https://${url.replace(/^\/+/, "")}`;
}

function ToolButton({ icon: Icon, label, active, disabled, onClick }: { icon: LucideIcon; label: string; active?: boolean; disabled?: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      aria-pressed={active}
      disabled={disabled}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={cn(
        "grid h-8 w-8 place-items-center rounded-lg text-muted transition hover:bg-glass-hover hover:text-ink disabled:opacity-40",
        active && "bg-primary-soft text-primary-text",
      )}
    >
      <Icon className="h-4 w-4" aria-hidden />
    </button>
  );
}

function Toolbar({ editor, onLink }: { editor: Editor; onLink: () => void }) {
  const s = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      bold: e.isActive("bold"),
      italic: e.isActive("italic"),
      underline: e.isActive("underline"),
      strike: e.isActive("strike"),
      h2: e.isActive("heading", { level: 2 }),
      h3: e.isActive("heading", { level: 3 }),
      bullet: e.isActive("bulletList"),
      ordered: e.isActive("orderedList"),
      quote: e.isActive("blockquote"),
      link: e.isActive("link"),
      undo: e.can().undo(),
      redo: e.can().redo(),
    }),
  });
  const run = () => editor.chain().focus();
  const divider = <span className="mx-1 h-5 w-px bg-glass-divider" aria-hidden />;

  return (
    <div role="toolbar" aria-label="Formatting" className="flex flex-wrap items-center gap-0.5 border-b border-glass-divider p-1.5">
      <ToolButton icon={Bold} label="Bold (Ctrl+B)" active={s.bold} onClick={() => run().toggleBold().run()} />
      <ToolButton icon={Italic} label="Italic (Ctrl+I)" active={s.italic} onClick={() => run().toggleItalic().run()} />
      <ToolButton icon={Underline} label="Underline (Ctrl+U)" active={s.underline} onClick={() => run().toggleUnderline().run()} />
      <ToolButton icon={Strikethrough} label="Strikethrough" active={s.strike} onClick={() => run().toggleStrike().run()} />
      {divider}
      <ToolButton icon={Heading2} label="Heading" active={s.h2} onClick={() => run().toggleHeading({ level: 2 }).run()} />
      <ToolButton icon={Heading3} label="Subheading" active={s.h3} onClick={() => run().toggleHeading({ level: 3 }).run()} />
      <ToolButton icon={List} label="Bullet list" active={s.bullet} onClick={() => run().toggleBulletList().run()} />
      <ToolButton icon={ListOrdered} label="Numbered list" active={s.ordered} onClick={() => run().toggleOrderedList().run()} />
      <ToolButton icon={Quote} label="Quote" active={s.quote} onClick={() => run().toggleBlockquote().run()} />
      {divider}
      <ToolButton icon={Link2} label="Add link (Ctrl+K)" active={s.link} onClick={onLink} />
      <ToolButton icon={Unlink} label="Remove link" disabled={!s.link} onClick={() => run().extendMarkRange("link").unsetLink().run()} />
      <ToolButton icon={RemoveFormatting} label="Clear formatting" onClick={() => run().unsetAllMarks().clearNodes().run()} />
      {divider}
      <ToolButton icon={Undo2} label="Undo (Ctrl+Z)" disabled={!s.undo} onClick={() => run().undo().run()} />
      <ToolButton icon={Redo2} label="Redo (Ctrl+Shift+Z)" disabled={!s.redo} onClick={() => run().redo().run()} />
    </div>
  );
}

/**
 * A rich-text field: paste a whole job ad from a website, Word or Google Docs and its bold,
 * italics, headings, lists and links come with it. Submits the HTML as a hidden input named
 * `name`; the API sanitizes it on save.
 */
export function RichTextEditor({
  id,
  name,
  defaultValue = "",
  placeholder,
  invalid,
  onChange,
}: {
  id: string;
  name: string;
  defaultValue?: string;
  placeholder?: string;
  invalid?: boolean;
  onChange?: (html: string, text: string) => void;
}) {
  const [html, setHtml] = useState(defaultValue);
  const [linkUrl, setLinkUrl] = useState<string | null>(null);

  const editor = useEditor({
    immediatelyRender: false,
    content: defaultValue,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
        code: false,
        codeBlock: false,
        link: { openOnClick: false, autolink: true, linkOnPaste: true, defaultProtocol: "https" },
      }),
      Placeholder.configure({ placeholder }),
    ],
    editorProps: {
      attributes: {
        id,
        role: "textbox",
        "aria-multiline": "true",
        "aria-invalid": invalid ? "true" : "false",
        class: "rich-text prose prose-sm max-w-none min-h-72 px-4 py-3 focus:outline-none",
      },
      handlePaste: (view, event) => {
        const data = event.clipboardData;
        const text = data?.getData("text/plain");
        // Rich pastes (web pages, Word, Docs) keep their HTML; only plain text is reshaped.
        if (!data || data.types.includes("text/html") || !text || !text.includes("\n")) return false;
        event.preventDefault();
        const dom = document.createElement("div");
        dom.innerHTML = plainTextToHtml(text);
        view.dispatch(view.state.tr.replaceSelection(ProseMirrorParser.fromSchema(view.state.schema).parseSlice(dom)));
        return true;
      },
    },
    onUpdate: ({ editor: e }) => {
      const next = e.isEmpty ? "" : e.getHTML();
      setHtml(next);
      onChange?.(next, e.getText());
    },
  });

  function openLink() {
    if (!editor) return;
    setLinkUrl((editor.getAttributes("link").href as string | undefined) ?? "");
  }

  function applyLink(e?: { preventDefault: () => void }) {
    e?.preventDefault();
    if (!editor || linkUrl === null) return;
    const href = normalizeUrl(linkUrl);
    const chain = editor.chain().focus().extendMarkRange("link");
    if (!href) chain.unsetLink().run();
    else if (editor.state.selection.empty && !editor.isActive("link")) {
      chain.insertContent({ type: "text", text: linkUrl.trim(), marks: [{ type: "link", attrs: { href } }] }).run();
    } else chain.setLink({ href }).run();
    setLinkUrl(null);
  }

  return (
    <div
      className={cn(controlClasses(invalid), "overflow-hidden px-0 focus-within:border-link focus-within:shadow-[0_0_0_4px_var(--primary-glow)]")}
      onKeyDown={(e) => {
        if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
          e.preventDefault();
          openLink();
        }
      }}
    >
      {editor ? <Toolbar editor={editor} onLink={openLink} /> : <div className="h-11 border-b border-glass-divider" aria-hidden />}
      {linkUrl !== null && (
        // Not a <form>: this sits inside the job form.
        <div className="flex items-center gap-2 border-b border-glass-divider px-3 py-2">
          <input
            autoFocus
            type="text"
            inputMode="url"
            aria-label="Link address"
            placeholder="https://… or name@company.com"
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") applyLink(e);
              if (e.key === "Escape") setLinkUrl(null);
            }}
            className="h-8 min-w-0 flex-1 rounded-lg border border-glass-border bg-transparent px-2.5 text-sm focus:border-link focus:outline-none"
          />
          <button type="button" onClick={() => applyLink()} className="h-8 rounded-lg bg-primary px-3 text-xs font-semibold text-primary-ink">
            Apply
          </button>
          <button type="button" onClick={() => setLinkUrl(null)} className="h-8 rounded-lg px-2 text-xs font-medium text-muted hover:text-ink">
            Cancel
          </button>
        </div>
      )}
      <EditorContent editor={editor} />
      <input type="hidden" name={name} value={html} />
    </div>
  );
}
