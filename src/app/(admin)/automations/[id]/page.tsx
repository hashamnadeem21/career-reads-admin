import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AutomationActivity } from "@/components/automations/AutomationActivity";
import { AutomationEditor } from "@/components/automations/AutomationEditor";
import { SendingSetupNotice } from "@/components/newsletters/SendingSetupNotice";
import { getCurrentUser } from "@/lib/auth/session";
import { requireStaff } from "@/lib/auth/require-user";
import { getAutomation } from "@/lib/automations/queries";
import { renderEmail } from "@/lib/newsletters/queries";
import { parseRouteId } from "@/lib/utils";

async function load(param: string) {
  const id = parseRouteId(param);
  return id ? getAutomation(id) : null;
}

export async function generateMetadata({ params }: PageProps<"/automations/[id]">): Promise<Metadata> {
  const user = await getCurrentUser();
  const data = user ? await load((await params).id) : null;
  return { title: data ? data.automation.name : "Automation not found" };
}

/** The automation's settings and email (editable any time), then how it's doing. */
export default async function AutomationPage({ params }: PageProps<"/automations/[id]">) {
  const user = await requireStaff();
  const data = await load((await params).id);
  if (!data) notFound();
  const { automation: a, stats, failures, recent, sendingReady } = data;
  const html = await renderEmail(a);
  const superAdmin = user.role === "super_admin";

  return (
    <>
      {!sendingReady && <SendingSetupNotice />}
      <AutomationEditor
        id={a.id}
        initial={{
          name: a.name,
          delayMinutes: a.delayMinutes,
          startsAt: a.startsAt?.toISOString() ?? null,
          endsAt: a.endsAt?.toISOString() ?? null,
          subject: a.subject,
          previewText: a.previewText,
          body: a.body,
        }}
        initialHtml={html}
        active={a.active}
        sendingReady={sendingReady}
        canToggle={superAdmin}
        userEmail={user.email}
      />
      <AutomationActivity id={a.id} stats={stats} failures={failures} recent={recent} canRetry={superAdmin} />
    </>
  );
}
