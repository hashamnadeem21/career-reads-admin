import type { Metadata } from "next";
import { NewsletterEditor } from "@/components/newsletters/NewsletterEditor";
import { SendingSetupNotice } from "@/components/newsletters/SendingSetupNotice";
import { requireStaff } from "@/lib/auth/require-user";
import { listNewsletters } from "@/lib/newsletters/queries";
import { EMAIL_EXTRAS } from "@/lib/newsletters/email-content";
import { env } from "@/lib/env";

export const metadata: Metadata = { title: "New newsletter" };

export default async function NewNewsletterPage() {
  const user = await requireStaff();
  const { activeSubscribers, sendingReady } = await listNewsletters();
  return (
    <>
      {!sendingReady && <SendingSetupNotice />}
      <NewsletterEditor
        siteOrigin={env().PUBLIC_SITE_URL}
        id={null}
        initial={{ subject: "", previewText: "", body: "", ...EMAIL_EXTRAS }}
        initialHtml={null}
        schedule={null}
        activeSubscribers={activeSubscribers}
        sendingReady={sendingReady}
        canSend={user.role === "super_admin"}
        userEmail={user.email}
      />
    </>
  );
}
