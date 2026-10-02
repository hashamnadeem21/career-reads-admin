"use client";

import { ArrowLeft, Inbox as InboxIcon, Mail, MailOpen, Reply, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { deleteMessage, setMessageRead } from "@/app/actions/messages";
import { Badge } from "@/components/admin/Badge";
import { Button } from "@/components/admin/Button";
import { EmptyState } from "@/components/admin/EmptyState";
import { ConfirmDialog } from "@/components/admin/GlassDialog";
import { cn, formatDate, timeAgo } from "@/lib/utils";

export interface InboxMessage {
  id: number;
  name: string;
  email: string;
  topic: string | null;
  message: string;
  read: boolean;
  createdAt: string;
}

/** Two-pane inbox: list on the left (unread = bold + blue dot), message on the right. */
export function Inbox({ messages: initial }: { messages: InboxMessage[] }) {
  const router = useRouter();
  const [items, setItems] = useState(initial);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [, start] = useTransition();
  const selected = items.find((m) => m.id === selectedId) ?? null;

  const open = (m: InboxMessage) => {
    setSelectedId(m.id);
    if (!m.read) {
      setItems((cur) => cur.map((x) => (x.id === m.id ? { ...x, read: true } : x)));
      start(() => setMessageRead(m.id, true));
    }
  };

  if (items.length === 0) {
    return <EmptyState icon={InboxIcon} title="No messages yet" description="Messages sent through the contact form on the site appear here." />;
  }

  return (
    <div className="grid min-h-[60vh] gap-4 lg:grid-cols-[minmax(0,360px)_minmax(0,1fr)]">
      <ul className={cn("admin-scroll flex max-h-[70vh] flex-col gap-1 overflow-y-auto", selected && "hidden lg:flex")} aria-label="Messages">
        {items.map((m) => (
          <li key={m.id}>
            <button
              type="button"
              onClick={() => open(m)}
              aria-current={m.id === selectedId ? "true" : undefined}
              className={cn("flex w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left transition hover:bg-hover", m.id === selectedId && "bg-primary-soft")}
            >
              <span className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", m.read ? "bg-transparent" : "bg-primary")} aria-hidden />
              <span className="min-w-0 flex-1">
                <span className="flex items-baseline justify-between gap-2">
                  <span className={cn("truncate text-sm", m.read ? "font-medium" : "font-bold")}>
                    {m.name}
                    {!m.read && <span className="sr-only"> (unread)</span>}
                  </span>
                  <time className="shrink-0 text-xs text-faint" dateTime={m.createdAt}>
                    {timeAgo(m.createdAt)}
                  </time>
                </span>
                {m.topic && <span className="block truncate text-xs font-semibold capitalize text-muted">{m.topic}</span>}
                <span className={cn("line-clamp-2 text-xs", m.read ? "text-muted" : "text-ink")}>{m.message}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>
      <section className={cn("glass-inset flex min-w-0 flex-col p-5", !selected && "hidden lg:flex")} aria-live="polite">
        {selected ? (
          <>
            <Button variant="ghost" size="sm" className="mb-3 self-start lg:hidden" onClick={() => setSelectedId(null)}>
              <ArrowLeft /> All messages
            </Button>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="text-lg font-semibold">{selected.name}</h2>
                <a href={`mailto:${selected.email}`} className="text-sm text-primary hover:underline">
                  {selected.email}
                </a>
                <p className="mt-1 text-xs text-muted">
                  {formatDate(selected.createdAt)} {selected.topic && <Badge className="ml-2 capitalize">{selected.topic}</Badge>}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  onClick={() => {
                    setItems((cur) => cur.map((x) => (x.id === selected.id ? { ...x, read: false } : x)));
                    start(() => setMessageRead(selected.id, false));
                    setSelectedId(null);
                  }}
                >
                  <Mail /> Mark unread
                </Button>
                <ConfirmDialog
                  trigger={
                    <Button size="sm" variant="ghost" aria-label="Delete message">
                      <Trash2 />
                    </Button>
                  }
                  title="Delete this message?"
                  description="It will be removed from the inbox for everyone."
                  onConfirm={async () => {
                    const r = await deleteMessage(selected.id);
                    (r.ok ? toast.success : toast.error)(r.message);
                    setItems((cur) => cur.filter((x) => x.id !== selected.id));
                    setSelectedId(null);
                    router.refresh();
                  }}
                />
              </div>
            </div>
            <p className="mt-5 whitespace-pre-wrap text-[15px] leading-relaxed">{selected.message}</p>
            <div className="mt-auto pt-6">
              <Button asChild variant="primary">
                <a href={`mailto:${selected.email}?subject=${encodeURIComponent(`Re: your message to BlogNest${selected.topic ? ` (${selected.topic})` : ""}`)}`}>
                  <Reply /> Reply by email
                </a>
              </Button>
            </div>
          </>
        ) : (
          <EmptyState icon={MailOpen} title="Select a message to read it" compact className="my-auto" />
        )}
      </section>
    </div>
  );
}
