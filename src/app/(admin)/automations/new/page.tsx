import type { Metadata } from "next";
import { AutomationEditor } from "@/components/automations/AutomationEditor";
import { SendingSetupNotice } from "@/components/newsletters/SendingSetupNotice";
import { requireStaff } from "@/lib/auth/require-user";
import { listAutomations } from "@/lib/automations/queries";
import { EMAIL_EXTRAS } from "@/lib/newsletters/email-content";
import { env } from "@/lib/env";

export const metadata: Metadata = { title: "New automation" };

export default async function NewAutomationPage() {
  const user = await requireStaff();
  const { sendingReady } = await listAutomations();
  return (
    <>
      {!sendingReady && <SendingSetupNotice />}
      <AutomationEditor
        siteOrigin={env().PUBLIC_SITE_URL}
        id={null}
        initial={{ name: "", trigger: "subscribed", delayMinutes: 0, startsAt: null, endsAt: null, subject: "", previewText: "", body: "", ...EMAIL_EXTRAS }}
        initialHtml={null}
        active={false}
        sendingReady={sendingReady}
        canToggle={user.role === "super_admin"}
        userEmail={user.email}
      />
    </>
  );
}
