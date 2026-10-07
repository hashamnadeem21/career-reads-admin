import { cn } from "@/lib/utils";

/**
 * The Career Reads mark: a briefcase (jobs) with an open, bookmarked book (articles).
 * The blue tile is CSS rather than an SVG gradient: the sidebar renders two logos (one hidden
 * by breakpoint), and a shared gradient id would resolve to the hidden copy and vanish.
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex overflow-hidden rounded-[25%] bg-gradient-to-br from-[#2563EB] to-[#0EA5E9]", className)} aria-hidden>
      <svg viewBox="0 0 64 64" className="h-full w-full">
        <path d="M24.5 21.5v-2.6a3.4 3.4 0 0 1 3.4-3.4h8.2a3.4 3.4 0 0 1 3.4 3.4v2.6" fill="none" stroke="#fff" strokeWidth="3.2" strokeLinecap="round" />
        <rect x="10" y="21" width="44" height="30" rx="7" fill="#fff" />
        <path d="M32 45.2c-4.3-2.6-9-3.5-14.2-2.9V29.2c5.2-.6 9.9.3 14.2 2.9z" fill="#2563EB" />
        <path d="M32 45.2c4.3-2.6 9-3.5 14.2-2.9V29.2c-5.2-.6-9.9.3-14.2 2.9z" fill="#0EA5E9" />
        <path d="M30.4 32.3v9.6l1.6-1.2 1.6 1.2v-9.6z" fill="#F59E0B" />
      </svg>
    </span>
  );
}

/** Mark + "Career Reads" + a small label ("Admin" for staff, "Employers" for company accounts). */
export function Logo({ compact, className, label = "Admin" }: { compact?: boolean; className?: string; label?: string }) {
  return (
    <span className={cn("flex items-center gap-2.5 font-bold tracking-tight", className)}>
      <LogoMark className="glow-primary h-9 w-9 shrink-0" />
      {!compact && (
        <span className="whitespace-nowrap text-[17px]">
          Career Reads <span className="font-medium text-muted">{label}</span>
        </span>
      )}
    </span>
  );
}
