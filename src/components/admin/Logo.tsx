import { cn } from "@/lib/utils";

export function Logo({ compact, className }: { compact?: boolean; className?: string }) {
  return (
    <span className={cn("flex items-center gap-2.5 font-bold tracking-tight", className)}>
      <span className="glow-primary flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#3b82f6] to-[#1d4ed8] text-white" aria-hidden>
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 18c3-1 5-4 8-4s5 3 8 4" />
          <path d="M7 11c1.5-3.5 3-5 5-5s3.5 1.5 5 5" />
        </svg>
      </span>
      {!compact && (
        <span className="text-[17px]">
          BlogNest <span className="font-medium text-muted">Admin</span>
        </span>
      )}
    </span>
  );
}
