"use client";

import { CircleAlert, Clock, MailCheck, MailX, RotateCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { retryAutomation } from "@/app/actions/automations";
import { Badge, type Tone } from "@/components/admin/Badge";
import { Button } from "@/components/admin/Button";
import { EmptyState } from "@/components/admin/EmptyState";
import { GlassPanel, PanelHeader } from "@/components/admin/Glass";
import { LocalTime } from "@/components/admin/LocalTime";
import { StatStrip } from "@/components/admin/StatStrip";
import type { AutomationDelivery, AutomationDeliveryStatus, DeliveryStats } from "@/lib/api/types";
import { formatNumber } from "@/lib/utils";

const tone: Record<AutomationDeliveryStatus, Tone> = { pending: "info", sent: "success", failed: "danger", skipped: "neutral" };
const label: Record<AutomationDeliveryStatus, string> = { pending: "Waiting", sent: "Sent", failed: "Failed", skipped: "Skipped" };

/** How an automation is doing: counts, why any failed, and who it went to most recently. */
export function AutomationActivity({
  id,
  stats,
  failures,
  recent,
  canRetry,
}: {
  id: number;
  stats: DeliveryStats;
  failures: { error: string | null; count: number }[];
  recent: AutomationDelivery[];
  canRetry: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();

  return (
    <section aria-labelledby="activity-title" className="mt-8">
      <h2 id="activity-title" className="mb-3 text-lg font-semibold">
        Activity
      </h2>
      <StatStrip
        items={[
          { icon: MailCheck, label: "Sent", value: formatNumber(stats.sent) },
          { icon: Clock, label: "Waiting", value: formatNumber(stats.pending) },
          { icon: CircleAlert, label: "Failed", value: formatNumber(stats.failed) },
          { icon: MailX, label: "Skipped", value: formatNumber(stats.skipped) },
        ]}
      />

      {failures.length > 0 && (
        <GlassPanel className="rise-in mb-5">
          <PanelHeader
            title="Why some emails failed"
            description="Each one was tried 3 times, 15 minutes apart."
            actions={
              canRetry && (
                <Button
                  size="sm"
                  variant="primary"
                  disabled={pending}
                  onClick={() =>
                    start(async () => {
                      const result = await retryAutomation(id);
                      (result.ok ? toast.success : toast.error)(result.message);
                      router.refresh();
                    })
                  }
                >
                  <RotateCw /> Retry {formatNumber(stats.failed)}
                </Button>
              )
            }
          />
          <ul className="flex flex-col gap-2 text-sm">
            {failures.map((f) => (
              <li key={f.error ?? "unknown"} className="glass-inset flex items-start justify-between gap-3 px-3 py-2">
                <span className="min-w-0">{f.error ?? "Unknown error"}</span>
                <span className="num shrink-0 text-muted">{formatNumber(f.count)}</span>
              </li>
            ))}
          </ul>
        </GlassPanel>
      )}

      <GlassPanel className="rise-in">
        <PanelHeader title="Latest emails" description="The 25 most recent people this automation was queued for." />
        {recent.length === 0 ? (
          <EmptyState icon={Clock} compact title="Nothing sent yet" description="Emails appear here as people subscribe while it's switched on." />
        ) : (
          <ul className="divide-y divide-divider text-sm">
            {recent.map((d) => (
              <li key={d.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2.5">
                <span className="min-w-0 flex-1 truncate font-medium">{d.email}</span>
                <span className="text-xs text-muted">
                  {d.status === "sent" && d.sentAt ? (
                    <>
                      Sent <LocalTime date={d.sentAt} />
                    </>
                  ) : d.status === "pending" ? (
                    <>
                      Due <LocalTime date={d.dueAt} />
                    </>
                  ) : (
                    d.error
                  )}
                </span>
                <Badge tone={tone[d.status]} dot>
                  {label[d.status]}
                </Badge>
              </li>
            ))}
          </ul>
        )}
      </GlassPanel>
    </section>
  );
}
