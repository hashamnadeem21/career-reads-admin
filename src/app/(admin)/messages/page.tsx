import type { Metadata } from "next";
import Link from "next/link";
import { GlassPanel, PageHeader } from "@/components/admin/Glass";
import { Inbox } from "@/components/messages/Inbox";
import { SubscribersTable } from "@/components/messages/SubscribersTable";
import { apiFetch } from "@/lib/api/client";
import { requireStaff } from "@/lib/auth/require-user";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Messages" };

interface InboxRow {
  id: number;
  name: string;
  email: string;
  topic: string | null;
  message: string;
  read: boolean;
  createdAt: string;
}

interface SubscriberRow {
  id: number;
  email: string;
  confirmed: boolean;
  createdAt: string;
}

export default async function MessagesPage({ searchParams }: PageProps<"/messages">) {
  await requireStaff();
  const tab = (await searchParams).tab === "subscribers" ? "subscribers" : "messages";
  // Each list comes with both tab counts.
  const data =
    tab === "messages"
      ? { kind: "messages" as const, ...(await apiFetch<{ items: InboxRow[]; unread: number; subscribers: number }>("/messages")) }
      : { kind: "subscribers" as const, ...(await apiFetch<{ items: SubscriberRow[]; unread: number; subscribers: number }>("/subscribers")) };
  const { unread, subscribers: subs } = data;

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
        {data.kind === "messages" ? (
          <Inbox messages={data.items} />
        ) : (
          <SubscribersTable total={subs} rows={data.items} />
        )}
      </GlassPanel>
    </>
  );
}
