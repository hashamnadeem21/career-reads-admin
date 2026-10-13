"use client";

import { Inbox as InboxIcon, MailOpen, Search, SearchX } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useEffectEvent, useState, useTransition } from "react";
import { toast } from "sonner";
import { deleteMessage, setMessageRead } from "@/app/actions/messages";
import { Button } from "@/components/admin/Button";
import { EmptyState } from "@/components/admin/EmptyState";
import { controlClasses } from "@/components/admin/Field";
import { type InboxMessage, matchesQuery } from "@/lib/messages/inbox";
import { cn } from "@/lib/utils";
import { MessageList } from "./MessageList";
import { MessageView } from "./MessageView";

export type { InboxMessage };

/** "all", "unread", or a topic name. */
type Filter = string;

/** Keys typed into a field shouldn't move around the inbox. */
function isTyping(target: EventTarget | null): boolean {
  return target instanceof HTMLElement && (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName));
}

/**
 * Two-pane inbox: search and filters on top, messages grouped by day on the left, the open message
 * and a reply box on the right. J/K (or ↓/↑) move between messages, U marks unread, Esc closes.
 */
export function Inbox({ messages: initial }: { messages: InboxMessage[] }) {
  const router = useRouter();
  const [items, setItems] = useState(initial);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [, start] = useTransition();

  const unread = items.filter((m) => !m.read).length;
  const topics = [...new Set(items.map((m) => m.topic).filter((t): t is string => Boolean(t)))].sort();
  // The open message stays in the Unread filter after it's read, so the list doesn't jump under you.
  const visible = items.filter(
    (m) =>
      (filter === "all" || (filter === "unread" ? !m.read || m.id === selectedId : m.topic === filter)) && matchesQuery(m, query),
  );
  const index = visible.findIndex((m) => m.id === selectedId);
  const selected = index >= 0 ? visible[index] : (items.find((m) => m.id === selectedId) ?? null);

  const open = (m: InboxMessage) => {
    setSelectedId(m.id);
    document.querySelector(`[data-message-id="${m.id}"]`)?.scrollIntoView({ block: "nearest" });
    if (!m.read) {
      setItems((cur) => cur.map((x) => (x.id === m.id ? { ...x, read: true } : x)));
      start(() => setMessageRead(m.id, true));
    }
  };

  const step = (delta: 1 | -1) => {
    const next = visible[index + delta] ?? (index < 0 ? visible[0] : undefined);
    if (next) open(next);
  };

  const markUnread = (m: InboxMessage) => {
    setItems((cur) => cur.map((x) => (x.id === m.id ? { ...x, read: false } : x)));
    start(() => setMessageRead(m.id, false));
    setSelectedId(null);
  };

  const remove = async (m: InboxMessage) => {
    const next = visible[index + 1] ?? visible[index - 1] ?? null;
    const r = await deleteMessage(m.id);
    (r.ok ? toast.success : toast.error)(r.message);
    if (!r.ok) return;
    setItems((cur) => cur.filter((x) => x.id !== m.id));
    setSelectedId(next?.id ?? null);
    router.refresh();
  };

  const onKey = useEffectEvent((e: KeyboardEvent) => {
    if (e.metaKey || e.ctrlKey || e.altKey || isTyping(e.target)) return;
    if (e.key === "j" || e.key === "ArrowDown") step(1);
    else if (e.key === "k" || e.key === "ArrowUp") step(-1);
    else if (e.key === "Escape" && selected) setSelectedId(null);
    else if (e.key === "u" && selected) markUnread(selected);
    else if (e.key === "/") document.getElementById("inbox-search")?.focus();
    else return;
    e.preventDefault();
  });
  useEffect(() => {
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  if (items.length === 0) {
    return <EmptyState icon={InboxIcon} title="No messages yet" description="Messages sent through the contact form on the site appear here." />;
  }

  const chips: { value: Filter; label: string; count: number }[] = [
    { value: "all", label: "All", count: items.length },
    { value: "unread", label: "Unread", count: unread },
    ...topics.map((t) => ({ value: t, label: t, count: items.filter((m) => m.topic === t).length })),
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <label className="relative md:w-72">
          <span className="sr-only">Search messages</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden />
          <input
            id="inbox-search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Escape" && e.currentTarget.blur()}
            placeholder="Search name, email or text…"
            className={cn(controlClasses(), "h-10 pl-9 pr-10")}
          />
          <kbd className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 rounded border border-glass-border px-1.5 text-[11px] text-faint md:block">/</kbd>
        </label>
        <div role="radiogroup" aria-label="Show" className="flex flex-wrap gap-1.5">
          {chips.map((c) => (
            <button
              key={c.value}
              type="button"
              role="radio"
              aria-checked={filter === c.value}
              onClick={() => setFilter(c.value)}
              className={cn(
                "inline-flex h-9 items-center gap-1.5 rounded-full border px-3 text-[13px] font-semibold capitalize transition",
                filter === c.value ? "border-primary bg-primary text-primary-ink" : "border-glass-border bg-inset text-muted hover:text-ink",
              )}
            >
              {c.label}
              <span className="num text-xs opacity-80">{c.count}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="grid min-h-[62vh] gap-4 lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)]">
        {visible.length > 0 ? (
          <MessageList messages={visible} selectedId={selectedId} onOpen={open} className={cn(selected && "hidden lg:flex")} />
        ) : (
          <div className={cn("glass-inset flex items-center justify-center p-6", selected && "hidden lg:flex")}>
            <EmptyState
              icon={SearchX}
              compact
              title={filter === "unread" && !query ? "You're all caught up" : "No messages match"}
              description={filter === "unread" && !query ? "Every message has been read." : undefined}
              action={
                <Button
                  size="sm"
                  onClick={() => {
                    setQuery("");
                    setFilter("all");
                  }}
                >
                  Show all messages
                </Button>
              }
            />
          </div>
        )}

        <section className={cn("glass-inset flex min-w-0 flex-col p-5 sm:p-6", !selected && "hidden lg:flex")} aria-live="polite">
          {selected ? (
            <MessageView
              message={selected}
              position={{ index: Math.max(index, 0), total: visible.length }}
              onBack={() => setSelectedId(null)}
              onPrev={index > 0 ? () => step(-1) : null}
              onNext={index >= 0 && index < visible.length - 1 ? () => step(1) : null}
              onMarkUnread={() => markUnread(selected)}
              onDelete={() => remove(selected)}
            />
          ) : (
            <div className="my-auto flex flex-col items-center gap-4">
              <EmptyState
                icon={MailOpen}
                compact
                title={unread ? `${unread} unread message${unread === 1 ? "" : "s"}` : "Select a message to read it"}
                description="Pick one from the list, or use the keyboard."
              />
              <ul className="flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs text-faint">
                <Shortcut keys={["J", "K"]} label="next / previous" />
                <Shortcut keys={["U"]} label="mark unread" />
                <Shortcut keys={["/"]} label="search" />
                <Shortcut keys={["Esc"]} label="close" />
              </ul>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function Shortcut({ keys, label }: { keys: string[]; label: string }) {
  return (
    <li className="flex items-center gap-1">
      {keys.map((k) => (
        <kbd key={k} className="rounded border border-glass-border bg-inset px-1.5 py-0.5 font-sans text-[11px] font-semibold text-muted">
          {k}
        </kbd>
      ))}
      <span className="ml-1">{label}</span>
    </li>
  );
}
