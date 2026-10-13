"use client";

import { ArrowLeft, ChevronDown, ChevronUp, Copy, Mail, Send, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Avatar } from "@/components/admin/Avatar";
import { Badge } from "@/components/admin/Badge";
import { Button } from "@/components/admin/Button";
import { Textarea } from "@/components/admin/Field";
import { ConfirmDialog } from "@/components/admin/GlassDialog";
import { type InboxMessage, replyMailto, replyTemplates, topicTone } from "@/lib/messages/inbox";
import { firstName, formatDate, timeAgo } from "@/lib/utils";

async function copy(text: string, what: string) {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(`${what} copied.`);
  } catch {
    toast.error(`Couldn't copy the ${what.toLowerCase()}.`);
  }
}

/** The open message: who sent it, what they wrote, and a reply box that hands off to your email app. */
export function MessageView({
  message: m,
  position,
  onBack,
  onPrev,
  onNext,
  onMarkUnread,
  onDelete,
}: {
  message: InboxMessage;
  /** "3 of 12" in the current filter. */
  position: { index: number; total: number };
  onBack: () => void;
  onPrev: (() => void) | null;
  onNext: (() => void) | null;
  onMarkUnread: () => void;
  onDelete: () => Promise<void>;
}) {
  return (
    <article className="flex min-h-full flex-col gap-5" aria-labelledby="message-from">
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="sm" className="lg:hidden" onClick={onBack}>
          <ArrowLeft /> All messages
        </Button>
        <span className="num mr-1 hidden text-xs text-faint lg:inline">
          {position.index + 1} of {position.total}
        </span>
        <Button variant="ghost" size="icon-sm" aria-label="Newer message (K)" title="Newer (K)" disabled={!onPrev} onClick={onPrev ?? undefined}>
          <ChevronUp />
        </Button>
        <Button variant="ghost" size="icon-sm" aria-label="Older message (J)" title="Older (J)" disabled={!onNext} onClick={onNext ?? undefined}>
          <ChevronDown />
        </Button>
        <span className="flex-1" />
        <Button size="sm" variant="ghost" onClick={onMarkUnread} title="Mark unread (U)">
          <Mail /> <span className="hidden sm:inline">Mark unread</span>
        </Button>
        <ConfirmDialog
          trigger={
            <Button size="icon-sm" variant="ghost" aria-label="Delete message">
              <Trash2 />
            </Button>
          }
          title="Delete this message?"
          description="It will be removed from the inbox for everyone."
          onConfirm={onDelete}
        />
      </div>

      <header className="flex items-start gap-4">
        <Avatar name={m.name} size={52} className="text-sm" />
        <div className="min-w-0 flex-1">
          <h2 id="message-from" className="truncate text-xl font-bold tracking-tight">
            {m.name}
          </h2>
          <div className="mt-0.5 flex min-w-0 items-center gap-1">
            <a href={`mailto:${m.email}`} className="truncate text-sm text-link hover:underline">
              {m.email}
            </a>
            <Button variant="ghost" size="icon-sm" aria-label="Copy email address" title="Copy email" onClick={() => copy(m.email, "Email")}>
              <Copy />
            </Button>
          </div>
          <p className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-muted">
            {m.topic && (
              <Badge tone={topicTone(m.topic)} dot className="capitalize">
                {m.topic}
              </Badge>
            )}
            <time dateTime={m.createdAt}>
              {formatDate(m.createdAt)} · {timeAgo(m.createdAt)}
            </time>
          </p>
        </div>
      </header>

      <div className="glass-inset rounded-2xl p-5">
        <p className="whitespace-pre-wrap break-words text-[15px] leading-7">{m.message}</p>
      </div>

      {/* Remount per message so a half-written reply never carries over to someone else. */}
      <ReplyBox key={m.id} message={m} />
    </article>
  );
}

function ReplyBox({ message: m }: { message: InboxMessage }) {
  const [draft, setDraft] = useState("");
  const templates = replyTemplates(m);

  return (
    <section className="mt-auto rounded-2xl border border-glass-border bg-hover/40 p-4" aria-label={`Reply to ${m.name}`}>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="text-sm font-semibold">Reply to {firstName(m.name)}</span>
        <span className="flex-1" />
        <span className="text-xs text-faint">Start with:</span>
        {templates.map((t) => (
          <button
            key={t.label}
            type="button"
            onClick={() => setDraft(t.text)}
            className="rounded-full border border-glass-border bg-inset px-2.5 py-1 text-xs font-semibold text-muted transition hover:border-primary hover:text-ink"
          >
            {t.label}
          </button>
        ))}
      </div>
      <Textarea
        aria-label={`Your reply to ${m.name}`}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        rows={6}
        placeholder={`Hi ${firstName(m.name)},…`}
        className="resize-y"
      />
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <p className="mr-auto text-xs text-faint">Opens your email app with their message quoted below.</p>
        <Button size="sm" variant="ghost" disabled={!draft.trim()} onClick={() => copy(draft, "Reply")}>
          <Copy /> Copy
        </Button>
        <Button asChild size="sm" variant="primary">
          <a href={replyMailto(m, draft)}>
            <Send /> {draft.trim() ? "Send from email app" : "Reply in email app"}
          </a>
        </Button>
      </div>
    </section>
  );
}
