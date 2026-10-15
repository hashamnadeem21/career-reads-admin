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
import { emailContentOf } from "@/lib/newsletters/email-content";
import { env } from "@/lib/env";

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
        siteOrigin={env().PUBLIC_SITE_URL}
        id={a.id}
        initial={{
          name: a.name,
          trigger: a.trigger,
          delayMinutes: a.delayMinutes,
          startsAt: a.startsAt?.toISOString() ?? null,
          endsAt: a.endsAt?.toISOString() ?? null,
          ...emailContentOf(a),
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
