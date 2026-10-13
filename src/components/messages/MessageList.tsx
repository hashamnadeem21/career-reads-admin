"use client";

import { Avatar } from "@/components/admin/Avatar";
import { Badge } from "@/components/admin/Badge";
import { groupByDay, type InboxMessage, topicTone } from "@/lib/messages/inbox";
import { cn, timeAgo } from "@/lib/utils";

/** Messages grouped by day. Unread ones are bold with a blue dot on the avatar. */
export function MessageList({
  messages,
  selectedId,
  onOpen,
  className,
}: {
  messages: InboxMessage[];
  selectedId: number | null;
  onOpen: (m: InboxMessage) => void;
  className?: string;
}) {
  return (
    <div className={cn("admin-scroll flex max-h-[72vh] flex-col gap-4 overflow-y-auto pr-1", className)}>
      {groupByDay(messages).map((group) => (
        <section key={group.label} aria-label={group.label}>
          <h3 className="mb-1.5 px-3 text-[11px] font-bold uppercase tracking-wider text-faint">{group.label}</h3>
          <ul className="flex flex-col gap-1">
            {group.items.map((m) => (
              <li key={m.id}>
                <MessageRow message={m} selected={m.id === selectedId} onOpen={() => onOpen(m)} />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

function MessageRow({ message: m, selected, onOpen }: { message: InboxMessage; selected: boolean; onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-current={selected ? "true" : undefined}
      data-message-id={m.id}
      className={cn(
        "group relative flex w-full items-start gap-3 rounded-2xl px-3 py-3 text-left transition",
        selected ? "bg-primary-soft" : "hover:bg-hover",
      )}
    >
      {selected && <span className="absolute inset-y-3 left-0 w-1 rounded-full bg-primary" aria-hidden />}
      <span className="relative">
        <Avatar name={m.name} size={40} />
        {!m.read && <span className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full border-2 border-white bg-primary dark:border-zinc-800" aria-hidden />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-baseline justify-between gap-2">
          <span className={cn("truncate text-sm", m.read ? "font-medium text-muted" : "font-bold text-ink")}>
            {m.name}
            {!m.read && <span className="sr-only"> (unread)</span>}
          </span>
          <time className={cn("shrink-0 text-xs", m.read ? "text-faint" : "font-semibold text-link")} dateTime={m.createdAt}>
            {timeAgo(m.createdAt)}
          </time>
        </span>
        <span className="mt-1 flex min-w-0 items-center gap-2">
          {m.topic && (
            <Badge tone={topicTone(m.topic)} className="shrink-0 px-2 py-0 text-[11px] capitalize">
              {m.topic}
            </Badge>
          )}
          <span className={cn("truncate text-[13px]", m.read ? "text-faint" : "text-ink")}>{m.message}</span>
        </span>
      </span>
    </button>
  );
}
