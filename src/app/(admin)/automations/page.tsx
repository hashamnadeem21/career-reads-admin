import { Newspaper, Plus, Zap } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { buttonClasses } from "@/components/admin/Button";
import { EmptyState } from "@/components/admin/EmptyState";
import { GlassPanel, PageHeader } from "@/components/admin/Glass";
import { AutomationCard } from "@/components/automations/AutomationCard";
import { SendingSetupNotice } from "@/components/newsletters/SendingSetupNotice";
import { requireStaff } from "@/lib/auth/require-user";
import { listAutomations } from "@/lib/automations/queries";

export const metadata: Metadata = { title: "Automations" };

export default async function AutomationsPage() {
  const user = await requireStaff();
  const { items, sendingReady } = await listAutomations();

  return (
    <>
      <PageHeader
        title="Automations"
        description="Emails that go out by themselves, like the welcome email when someone subscribes. Each person gets each one once."
        actions={
          <>
            <Link href="/newsletters" className={buttonClasses()}>
              <Newspaper /> Newsletters
            </Link>
            <Link href="/automations/new" className={buttonClasses({ variant: "primary" })}>
              <Plus /> New automation
            </Link>
          </>
        }
      />
      {!sendingReady && <SendingSetupNotice />}
      {items.length === 0 ? (
        <GlassPanel className="rise-in">
          <EmptyState
            icon={Zap}
            title="No automations yet"
            description="Create a welcome email that every new subscriber gets automatically."
            action={
              <Link href="/automations/new" className={buttonClasses({ variant: "primary" })}>
                <Plus /> New automation
              </Link>
            }
          />
        </GlassPanel>
      ) : (
        <div className="rise-in grid gap-4 lg:grid-cols-2">
          {items.map((a) => (
            <AutomationCard key={a.id} automation={a} canToggle={user.role === "super_admin"} sendingReady={sendingReady} />
          ))}
        </div>
      )}
    </>
  );
}
