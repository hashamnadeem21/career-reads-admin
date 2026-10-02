import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Soft illustration + one sentence + an optional primary action. Never fake numbers. */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
  compact,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
  compact?: boolean;
}) {
  return (
    <div className={cn("flex flex-col items-center justify-center text-center", compact ? "gap-2 py-6" : "gap-3 py-12", className)}>
      <span className="relative flex items-center justify-center" aria-hidden>
        <span className="absolute h-16 w-16 rounded-full bg-primary-soft blur-xl" />
        <span className="glass-inset relative flex h-12 w-12 items-center justify-center rounded-2xl text-primary">
          <Icon className="h-5 w-5" />
        </span>
      </span>
      <p className="max-w-xs text-sm font-semibold">{title}</p>
      {description && <p className="max-w-xs text-[13px] text-muted">{description}</p>}
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}
