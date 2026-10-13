"use client";

import { CircleAlert, MailCheck, RotateCw, Trash2, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { toast } from "sonner";
import { deleteNewsletter, retryNewsletter } from "@/app/actions/newsletters";
import { Button } from "@/components/admin/Button";
import { GlassPanel, PageHeader, PanelHeader } from "@/components/admin/Glass";
import { ConfirmDialog } from "@/components/admin/GlassDialog";
import { StatStrip } from "@/components/admin/StatStrip";
import type { NewsletterStatus as Status } from "@/lib/api/types";
import { formatDate, formatNumber } from "@/lib/utils";
import { AudienceSummary } from "./AudienceSummary";
import { EmailPreview } from "./EmailPreview";
import { NewsletterStatus } from "./NewsletterStatus";

const POLL_MS = 3000;

export interface NewsletterReportData {
  id: number;
  subject: string;
  status: Exclude<Status, "draft">;
  recipients: number;
  sentCount: number;
  failedCount: number;
  sentAt: string | null;
  audienceFrom: string | null;
  audienceTo: string | null;
  failures: { error: string | null; count: number }[];
}

/** A sent (or sending) newsletter: delivery numbers, why any failed, and the email itself. */
export function NewsletterReport({ data, html, canSend }: { data: NewsletterReportData; html: string; canSend: boolean }) {
  const router = useRouter();
  const sending = data.status === "sending";
  const done = data.sentCount + data.failedCount;
  const percent = data.recipients ? Math.round((done / data.recipients) * 100) : 0;

  // Refresh the numbers while it's going out.
  useEffect(() => {
    if (!sending) return;
    const timer = setInterval(() => router.refresh(), POLL_MS);
    return () => clearInterval(timer);
  }, [sending, router]);

  return (
    <>
      <PageHeader
        title={
          <span className="flex flex-wrap items-center gap-3">
            {data.subject} <NewsletterStatus status={data.status} />
          </span>
        }
        description={
          sending ? (
            <>
              Going out to <AudienceSummary from={data.audienceFrom} to={data.audienceTo} /> now. You can leave this page; it keeps
              sending.
            </>
          ) : (
            <>
              Sent {formatDate(data.sentAt)} to <AudienceSummary from={data.audienceFrom} to={data.audienceTo} />.
            </>
          )
        }
        actions={
          <>
            {canSend && data.status === "sent" && data.failedCount > 0 && (
              <Button
                variant="primary"
                onClick={async () => {
                  const result = await retryNewsletter(data.id);
                  (result.ok ? toast.success : toast.error)(result.message);
                  router.refresh();
                }}
              >
                <RotateCw /> Retry {formatNumber(data.failedCount)} failed
              </Button>
            )}
            {!sending && (
              <ConfirmDialog
                trigger={
                  <Button variant="ghost" size="icon" aria-label="Delete newsletter">
                    <Trash2 />
                  </Button>
                }
                title="Delete this newsletter?"
                description="Its delivery numbers go too. Subscribers keep the email they got."
                onConfirm={async () => {
                  const result = await deleteNewsletter(data.id);
                  (result.ok ? toast.success : toast.error)(result.message);
                  if (result.ok) router.push("/newsletters");
                }}
              />
            )}
          </>
        }
      />

      <StatStrip
        items={[
          { icon: Users, label: "Recipients", value: formatNumber(data.recipients) },
          { icon: MailCheck, label: "Delivered", value: formatNumber(data.sentCount) },
          { icon: CircleAlert, label: "Failed", value: formatNumber(data.failedCount) },
        ]}
      />

      {sending && (
        <div className="mb-5">
          <div
            role="progressbar"
            aria-label="Sending progress"
            aria-valuenow={percent}
            aria-valuemin={0}
            aria-valuemax={100}
            className="h-2 overflow-hidden rounded-full bg-inset"
          >
            <div className="h-full rounded-full bg-primary transition-[width] duration-500" style={{ width: `${percent}%` }} />
          </div>
          <p className="num mt-2 text-xs text-muted">
            {formatNumber(done)} of {formatNumber(data.recipients)} processed
          </p>
        </div>
      )}

      {data.failures.length > 0 && (
        <GlassPanel className="rise-in mb-5">
          <PanelHeader title="Why some emails failed" description="Usually a sender domain that isn't verified yet, or an address that doesn't exist." />
          <ul className="flex flex-col gap-2 text-sm">
            {data.failures.map((f) => (
              <li key={f.error ?? "unknown"} className="glass-inset flex items-start justify-between gap-3 px-3 py-2">
                <span className="min-w-0">{f.error ?? "Unknown error"}</span>
                <span className="num shrink-0 text-muted">{formatNumber(f.count)}</span>
              </li>
            ))}
          </ul>
        </GlassPanel>
      )}

      <GlassPanel className="rise-in">
        <EmailPreview html={html} />
      </GlassPanel>
    </>
  );
}
