import { count, desc, eq } from "drizzle-orm";
import type { Metadata } from "next";
import Link from "next/link";
import { GlassPanel, PageHeader } from "@/components/admin/Glass";
import { Inbox } from "@/components/messages/Inbox";
import { SubscribersTable } from "@/components/messages/SubscribersTable";
import { getDb } from "@/db";
import { messages, subscribers } from "@/db/schema";
import { requireStaff } from "@/lib/auth/require-user";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Messages" };

export default async function MessagesPage({ searchParams }: PageProps<"/messages">) {
  await requireStaff();
  const tab = (await searchParams).tab === "subscribers" ? "subscribers" : "messages";
  const db = getDb();
  const [[{ unread }], [{ subs }]] = await Promise.all([
    db.select({ unread: count() }).from(messages).where(eq(messages.read, false)),
    db.select({ subs: count() }).from(subscribers),
  ]);

  const tabs = [
    { key: "messages", label: "Messages", badge: unread },
    { key: "subscribers", label: "Subscribers", badge: subs },
  ] as const;

  return (
    <>
      <PageHeader title="Messages" description="Contact form messages and newsletter sign-ups from the site." />
      <nav aria-label="Messages sections" className="glass-inset mb-4 inline-flex p-1">
        {tabs.map((t) => (
          <Link
            key={t.key}
            href={t.key === "messages" ? "/messages" : "/messages?tab=subscribers"}
            aria-current={tab === t.key ? "page" : undefined}
            className={cn("inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-semibold", tab === t.key ? "bg-primary text-primary-ink" : "text-muted hover:text-ink")}
          >
            {t.label}
            <span className="num text-xs">{t.badge}</span>
          </Link>
        ))}
      </nav>
      <GlassPanel className="rise-in">
        {tab === "messages" ? (
          <Inbox
            messages={(await db.select().from(messages).orderBy(desc(messages.createdAt)).limit(200)).map((m) => ({
              id: m.id,
              name: m.name,
              email: m.email,
              topic: m.topic,
              message: m.message,
              read: m.read,
              createdAt: m.createdAt.toISOString(),
            }))}
          />
        ) : (
          <SubscribersTable
            total={subs}
            rows={(await db.select().from(subscribers).orderBy(desc(subscribers.createdAt)).limit(500)).map((s) => ({
              id: s.id,
              email: s.email,
              confirmed: s.confirmed,
              createdAt: s.createdAt.toISOString(),
            }))}
          />
        )}
      </GlassPanel>
    </>
  );
}
