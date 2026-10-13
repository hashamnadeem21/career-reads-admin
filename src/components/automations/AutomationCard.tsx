import { CalendarClock, Mail, Zap } from "lucide-react";
import Link from "next/link";
import { LocalTime } from "@/components/admin/LocalTime";
import type { AutomationListRow } from "@/lib/api/types";
import type { AutomationPhase } from "@/lib/automations/queries";
import { describeTrigger } from "@/lib/automations/delay";
import { cn, formatNumber } from "@/lib/utils";
import { ActiveSwitch } from "./ActiveSwitch";
import { AutomationStatus } from "./AutomationStatus";

/** One automation: what fires it, its email, how it's doing, and (for super admins) its switch. */
export function AutomationCard({
  automation: a,
  canToggle,
  sendingReady,
}: {
  automation: AutomationListRow & { phase: AutomationPhase };
  canToggle: boolean;
  sendingReady: boolean;
}) {
  const notYet = a.phase === "upcoming";
  const ended = a.phase === "ended";
  return (
    <article className={cn("glass-inset relative flex flex-col gap-4 rounded-2xl p-5 transition hover:-translate-y-0.5", a.active && "ring-1 ring-success/40")}>
      <div className="flex items-start gap-3">
        <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", a.active ? "bg-success-soft text-success" : "bg-hover text-muted")}>
          <Zap className="h-5 w-5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="flex flex-wrap items-center gap-2 text-base font-semibold">
            <Link href={`/automations/${a.id}`} className="truncate after:absolute after:inset-0 hover:text-link">
              {a.name}
            </Link>
            {!canToggle && <AutomationStatus active={a.active} />}
          </h2>
          <p className="mt-0.5 text-sm text-muted">{describeTrigger(a.trigger, a.delayMinutes)}</p>
        </div>
        {canToggle && (
          <div className="relative z-10">
            <ActiveSwitch id={a.id} active={a.active} disabled={!sendingReady && !a.active} />
          </div>
        )}
      </div>

      <p className="flex items-center gap-2 truncate text-sm">
        <Mail className="h-4 w-4 shrink-0 text-faint" aria-hidden />
        <span className="truncate font-medium">{a.subject}</span>
      </p>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
        <span>
          <strong className="num text-ink">{formatNumber(a.stats.sent)}</strong> sent
        </span>
        <span>
          <strong className="num text-ink">{formatNumber(a.stats.pending)}</strong> waiting
        </span>
        {a.stats.failed > 0 && (
          <span className="text-danger">
            <strong className="num">{formatNumber(a.stats.failed)}</strong> failed
          </span>
        )}
        {(a.startsAt || a.endsAt) && (
          <span className="ml-auto inline-flex items-center gap-1">
            <CalendarClock className="h-3.5 w-3.5" aria-hidden />
            {ended ? (
              <>
                Ended <LocalTime date={a.endsAt!} dateOnly />
              </>
            ) : notYet ? (
              <>
                Launches <LocalTime date={a.startsAt!} />
              </>
            ) : a.endsAt ? (
              <>
                Until <LocalTime date={a.endsAt} dateOnly />
              </>
            ) : (
              <>
                Since <LocalTime date={a.startsAt!} dateOnly />
              </>
            )}
          </span>
        )}
      </div>
    </article>
  );
}
