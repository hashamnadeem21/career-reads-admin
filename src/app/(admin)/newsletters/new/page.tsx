import type { Metadata } from "next";
import { NewsletterEditor } from "@/components/newsletters/NewsletterEditor";
import { SendingSetupNotice } from "@/components/newsletters/SendingSetupNotice";
import { requireStaff } from "@/lib/auth/require-user";
import { listNewsletters } from "@/lib/newsletters/queries";

export const metadata: Metadata = { title: "New newsletter" };

export default async function NewNewsletterPage() {
  const user = await requireStaff();
  const { activeSubscribers, sendingReady } = await listNewsletters();
  return (
    <>
      {!sendingReady && <SendingSetupNotice />}
      <NewsletterEditor
        id={null}
        initial={{ subject: "", previewText: "", body: "" }}
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
