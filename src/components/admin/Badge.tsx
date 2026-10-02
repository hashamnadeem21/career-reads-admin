import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type Tone = "neutral" | "success" | "warning" | "info" | "danger" | "primary";

const tones: Record<Tone, string> = {
  neutral: "bg-inset text-muted",
  success: "bg-success-soft text-success",
  warning: "bg-accent-soft text-accent",
  info: "bg-info-soft text-primary",
  danger: "bg-danger-soft text-danger",
  primary: "bg-primary text-primary-ink",
};

export function Badge({ tone = "neutral", children, className, dot }: { tone?: Tone; children: ReactNode; className?: string; dot?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold", tones[tone], className)}>
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden />}
      {children}
    </span>
  );
}

export type ContentState = "live" | "draft" | "scheduled" | "expired";

const stateTone: Record<ContentState, Tone> = { live: "success", draft: "warning", scheduled: "info", expired: "danger" };
const stateLabel: Record<ContentState, string> = { live: "Live", draft: "Draft", scheduled: "Scheduled", expired: "Expired" };

/** Status pill: Live = green, Draft = amber, Scheduled = blue, Expired = rose. */
export function StatusPill({ state, className }: { state: ContentState; className?: string }) {
  return (
    <Badge tone={stateTone[state]} dot className={className}>
      {stateLabel[state]}
    </Badge>
  );
}
