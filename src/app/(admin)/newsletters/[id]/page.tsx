import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { NewsletterEditor } from "@/components/newsletters/NewsletterEditor";
import { NewsletterReport } from "@/components/newsletters/NewsletterReport";
import { SendingSetupNotice } from "@/components/newsletters/SendingSetupNotice";
import { getCurrentUser } from "@/lib/auth/session";
import { requireStaff } from "@/lib/auth/require-user";
import { getNewsletter, renderEmail } from "@/lib/newsletters/queries";
import { parseRouteId } from "@/lib/utils";

async function load(param: string) {
  const id = parseRouteId(param);
  return id ? getNewsletter(id) : null;
}

export async function generateMetadata({ params }: PageProps<"/newsletters/[id]">): Promise<Metadata> {
  const user = await getCurrentUser();
  const data = user ? await load((await params).id) : null;
  return { title: data ? data.newsletter.subject : "Newsletter not found" };
}

/** Drafts and scheduled newsletters open in the editor; sent (or sending) ones show their delivery report. */
export default async function NewsletterPage({ params }: PageProps<"/newsletters/[id]">) {
  const user = await requireStaff();
  const data = await load((await params).id);
  if (!data) notFound();
  const { newsletter, activeSubscribers, sendingReady, failures } = data;
  const html = await renderEmail(newsletter);
  const canSend = user.role === "super_admin";

  if (newsletter.status === "draft" || newsletter.status === "scheduled") {
    return (
      <>
        {!sendingReady && <SendingSetupNotice />}
        <NewsletterEditor
          id={newsletter.id}
          initial={{ subject: newsletter.subject, previewText: newsletter.previewText, body: newsletter.body }}
          initialHtml={html}
          schedule={
            newsletter.status === "scheduled" && newsletter.scheduledAt
              ? { scheduledAt: newsletter.scheduledAt, audienceFrom: newsletter.audienceFrom, audienceTo: newsletter.audienceTo }
              : null
          }
          activeSubscribers={activeSubscribers}
          sendingReady={sendingReady}
          canSend={canSend}
          userEmail={user.email}
        />
      </>
    );
  }

  return (
    <NewsletterReport
      canSend={canSend}
      html={html}
      data={{
        id: newsletter.id,
        subject: newsletter.subject,
        status: newsletter.status,
        recipients: newsletter.recipients,
        sentCount: newsletter.sentCount,
        failedCount: newsletter.failedCount,
        sentAt: newsletter.sentAt?.toISOString() ?? null,
        audienceFrom: newsletter.audienceFrom?.toISOString() ?? null,
        audienceTo: newsletter.audienceTo?.toISOString() ?? null,
        failures,
      }}
    />
  );
}
