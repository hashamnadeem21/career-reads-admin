"use client";

import { formatLocalDate, formatLocalDateTime } from "@/lib/local-time";

/**
 * A date in the viewer's own timezone ("Wed 14 Oct, 9:00 am"). The server renders its own
 * timezone first, so the text is allowed to change on hydration.
 */
export function LocalTime({ date, dateOnly, className }: { date: Date | string; dateOnly?: boolean; className?: string }) {
  const value = new Date(date);
  return (
    <time dateTime={value.toISOString()} className={className} suppressHydrationWarning>
      {dateOnly ? formatLocalDate(value) : formatLocalDateTime(value)}
    </time>
  );
}
