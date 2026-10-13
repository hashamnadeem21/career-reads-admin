/**
 * Dates picked and shown in the editor's own timezone. The API stores UTC; these run in the
 * browser, so "9:00" means 9:00 where the admin is sitting.
 */

const pad = (n: number) => String(n).padStart(2, "0");

/** Date → "2026-10-14T09:00" for <input type="datetime-local">. */
export function toLocalInput(date: Date | string | null | undefined): string {
  if (!date) return "";
  const d = new Date(date);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Date → "2026-10-14" for <input type="date">. */
export function toLocalDateInput(date: Date | string | null | undefined): string {
  return toLocalInput(date).slice(0, 10);
}

/** "2026-10-14T09:00" (local) → ISO string, or null when empty or invalid. */
export function fromLocalInput(value: string): string | null {
  if (!value) return null;
  const d = new Date(value.length === 10 ? `${value}T00:00` : value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

/** The local midnight after "2026-10-14", as ISO: the exclusive end of an inclusive date range. */
export function endOfLocalDay(value: string): string | null {
  if (!value) return null;
  const d = new Date(`${value}T00:00`);
  if (Number.isNaN(d.getTime())) return null;
  d.setDate(d.getDate() + 1);
  return d.toISOString();
}

/** The day before an exclusive end, back as "2026-10-14" for the date input. */
export function inclusiveEndInput(date: Date | string | null | undefined): string {
  if (!date) return "";
  const d = new Date(date);
  d.setMinutes(d.getMinutes() - 1);
  return toLocalDateInput(d);
}

const dateTime = new Intl.DateTimeFormat(undefined, {
  weekday: "short",
  day: "numeric",
  month: "short",
  hour: "numeric",
  minute: "2-digit",
});
const dateOnly = new Intl.DateTimeFormat(undefined, { day: "numeric", month: "short", year: "numeric" });

/** "Wed 14 Oct, 9:00 am" in the browser's timezone. */
export function formatLocalDateTime(date: Date | string): string {
  return dateTime.format(new Date(date));
}

export function formatLocalDate(date: Date | string): string {
  return dateOnly.format(new Date(date));
}
