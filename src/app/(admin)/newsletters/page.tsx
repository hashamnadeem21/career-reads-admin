import { Plus, Users, Zap } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { buttonClasses } from "@/components/admin/Button";
import { GlassPanel, PageHeader } from "@/components/admin/Glass";
import { NewslettersTable } from "@/components/newsletters/NewslettersTable";
import { SendingSetupNotice } from "@/components/newsletters/SendingSetupNotice";
import { requireStaff } from "@/lib/auth/require-user";
import { listNewsletters } from "@/lib/newsletters/queries";
import { formatNumber } from "@/lib/utils";

export const metadata: Metadata = { title: "Newsletters" };

export default async function NewslettersPage() {
  await requireStaff();
  const { items, activeSubscribers, sendingReady } = await listNewsletters();

  return (
    <>
      <PageHeader
        title="Newsletters"
        description={
          <>
            Write newsletters and send them now or on a schedule.{" "}
            <Link href="/messages?tab=subscribers" className="inline-flex items-center gap-1 font-semibold text-link hover:underline">
              <Users className="h-3.5 w-3.5" aria-hidden />
              {formatNumber(activeSubscribers)} subscriber{activeSubscribers === 1 ? "" : "s"}
            </Link>
          </>
        }
        actions={
          <>
            <Link href="/automations" className={buttonClasses()}>
              <Zap /> Automations
            </Link>
            <Link href="/newsletters/new" className={buttonClasses({ variant: "primary" })}>
              <Plus /> New newsletter
            </Link>
          </>
        }
      />
      {!sendingReady && <SendingSetupNotice />}
      <GlassPanel className="rise-in">
        <NewslettersTable
          rows={items.map((n) => ({
            id: n.id,
            subject: n.subject,
            previewText: n.previewText,
            status: n.status,
            recipients: n.recipients,
            sentCount: n.sentCount,
            failedCount: n.failedCount,
            date: (n.status === "scheduled" && n.scheduledAt ? n.scheduledAt : (n.sentAt ?? n.updatedAt)).toISOString(),
          }))}
        />
      </GlassPanel>
    </>
  );
}
