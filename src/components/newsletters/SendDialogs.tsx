"use client";

import { CalendarClock, FlaskConical, Send, Users, UsersRound } from "lucide-react";
import { type ReactNode, useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { type AudienceInput, countAudience } from "@/app/actions/newsletters";
import { Button } from "@/components/admin/Button";
import { ChoiceCards } from "@/components/admin/ChoiceCards";
import { Field, Input } from "@/components/admin/Field";
import { GlassDialog } from "@/components/admin/GlassDialog";
import {
  endOfLocalDay,
  formatLocalDateTime,
  fromLocalInput,
  inclusiveEndInput,
  toLocalDateInput,
  toLocalInput,
} from "@/lib/local-time";
import { cn, formatNumber } from "@/lib/utils";

/** Saves pending edits first; resolves to the saved id, or null if saving failed. */
export type EnsureSaved = () => Promise<number | null>;

type ActionResult = { ok: boolean; message: string; errors?: Record<string, string> };

/** "Send test": emails the saved email to one address (yours by default), subject marked [Test]. */
export function TestSendDialog({
  ensureSaved,
  send,
  defaultEmail,
  disabled,
}: {
  ensureSaved: EnsureSaved;
  send: (id: number, email: string) => Promise<ActionResult>;
  defaultEmail: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState(defaultEmail);
  const [error, setError] = useState<string | undefined>();
  const [pending, start] = useTransition();

  const submit = () =>
    start(async () => {
      const id = await ensureSaved();
      if (!id) return;
      const result = await send(id, email);
      setError(result.errors?.email);
      if (result.errors?.email) return;
      (result.ok ? toast.success : toast.error)(result.message);
      if (result.ok) setOpen(false);
    });

  return (
    <GlassDialog
      open={open}
      onOpenChange={setOpen}
      trigger={
        <Button disabled={disabled}>
          <FlaskConical /> Send test
        </Button>
      }
      title="Send a test email"
      description="Check how it looks in a real inbox first. Unsaved changes are saved first."
      footer={
        <>
          <Button variant="secondary" onClick={() => setOpen(false)} disabled={pending}>
            Cancel
          </Button>
          <Button variant="primary" onClick={submit} disabled={pending}>
            {pending ? "Sending…" : "Send test"}
          </Button>
        </>
      }
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <Field label="Send to" htmlFor="test-email" error={error}>
          <Input id="test-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} invalid={Boolean(error)} autoComplete="email" />
        </Field>
      </form>
    </GlassDialog>
  );
}

export type SendMode = "now" | "schedule";

export interface SendChoice {
  mode: SendMode;
  /** ISO, when scheduling. */
  sendAt: string | null;
  audience: AudienceInput;
}

/** Quick picks for the schedule: in an hour, tomorrow 9:00, next Monday 9:00 (local time). */
function quickTimes(now: Date): { label: string; value: Date }[] {
  const inAnHour = new Date(now);
  inAnHour.setHours(now.getHours() + 1, 0, 0, 0);
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  tomorrow.setHours(9, 0, 0, 0);
  const monday = new Date(now);
  monday.setDate(now.getDate() + (((8 - now.getDay()) % 7) || 7));
  monday.setHours(9, 0, 0, 0);
  return [
    { label: "In an hour", value: inAnHour },
    { label: "Tomorrow, 9:00", value: tomorrow },
    { label: "Monday, 9:00", value: monday },
  ];
}

/**
 * Send now or schedule, to everyone or to people who subscribed between two dates. The live count
 * shows exactly how many people it will reach before you confirm.
 */
export function SendDialog({
  trigger,
  subject,
  activeSubscribers,
  initial,
  onConfirm,
}: {
  trigger: ReactNode;
  subject: string;
  activeSubscribers: number;
  initial?: Partial<SendChoice> & { audienceFrom?: Date | null; audienceTo?: Date | null; scheduledAt?: Date | null };
  /** Resolves true when it worked (the dialog closes). */
  onConfirm: (choice: SendChoice) => Promise<boolean>;
}) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<SendMode>(initial?.mode ?? "now");
  const [when, setWhen] = useState(() => toLocalInput(initial?.scheduledAt ?? null));
  const [audienceKind, setAudienceKind] = useState<"all" | "range">(initial?.audienceFrom || initial?.audienceTo ? "range" : "all");
  const [from, setFrom] = useState(() => toLocalDateInput(initial?.audienceFrom ?? null));
  const [to, setTo] = useState(() => inclusiveEndInput(initial?.audienceTo ?? null));
  const [count, setCount] = useState<number | null>(activeSubscribers);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const audience: AudienceInput = audienceKind === "all" ? { from: null, to: null } : { from: fromLocalInput(from), to: endOfLocalDay(to) };
  const sendAt = mode === "schedule" ? fromLocalInput(when) : null;
  const audienceKey = `${audience.from}|${audience.to}`;

  // Live audience size (debounced while dates are typed).
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const [f, t] = audienceKey.split("|");
    const timer = setTimeout(async () => {
      const n = await countAudience({ from: f === "null" ? null : f, to: t === "null" ? null : t });
      if (!cancelled) setCount(n);
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [open, audienceKey]);

  const problem =
    mode === "schedule" && !sendAt
      ? "Pick a date and time."
      : audienceKind === "range" && !audience.from && !audience.to
          ? "Pick at least one date."
          : audience.from && audience.to && audience.from >= audience.to
            ? "The end date must be after the start date."
            : count === 0 && mode === "now"
              ? "Nobody is in this audience."
              : null;

  const people = count === null ? "…" : `${formatNumber(count)} subscriber${count === 1 ? "" : "s"}`;
  const confirmLabel = mode === "now" ? `Send to ${people} now` : sendAt ? `Schedule for ${formatLocalDateTime(sendAt)}` : "Schedule";

  const submit = () =>
    start(async () => {
      setError(null);
      const tooSoon = sendAt && new Date(sendAt).getTime() < Date.now() + 60_000;
      const why = problem ?? (tooSoon ? "Pick a time at least a minute from now." : null);
      if (why) return setError(why);
      if (await onConfirm({ mode, sendAt, audience })) setOpen(false);
    });

  return (
    <GlassDialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) setError(null);
      }}
      trigger={trigger}
      title={mode === "now" ? "Send this newsletter" : "Schedule this newsletter"}
      description={<>&ldquo;{subject || "Untitled"}&rdquo;. Unsaved changes are saved first.</>}
      className="sm:max-w-xl"
      footer={
        <>
          <Button variant="secondary" onClick={() => setOpen(false)} disabled={pending}>
            Cancel
          </Button>
          <Button variant="primary" onClick={submit} disabled={pending || count === null}>
            {mode === "now" ? <Send /> : <CalendarClock />}
            {pending ? "Working…" : confirmLabel}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-5">
        <section className="flex flex-col gap-2">
          <h3 className="text-[13px] font-semibold text-muted">When</h3>
          <ChoiceCards
            label="When"
            value={mode}
            onChange={setMode}
            choices={[
              { value: "now", label: "Send now", description: "Goes out within a minute.", icon: Send },
              { value: "schedule", label: "Schedule", description: "Pick a date and time.", icon: CalendarClock },
            ]}
          />
          {mode === "schedule" && (
            <div className="glass-inset flex flex-col gap-3 p-3">
              <Field label="Date and time" htmlFor="send-at" hint={`Your time (${Intl.DateTimeFormat().resolvedOptions().timeZone}).`}>
                <Input id="send-at" type="datetime-local" value={when} min={toLocalInput(new Date())} onChange={(e) => setWhen(e.target.value)} />
              </Field>
              <div className="flex flex-wrap gap-1.5">
                {quickTimes(new Date()).map((q) => (
                  <button
                    key={q.label}
                    type="button"
                    onClick={() => setWhen(toLocalInput(q.value))}
                    className={cn(
                      "rounded-full border px-3 py-1 text-xs font-semibold transition",
                      when === toLocalInput(q.value) ? "border-primary bg-primary text-primary-ink" : "border-glass-border bg-inset text-muted hover:text-ink",
                    )}
                  >
                    {q.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </section>

        <section className="flex flex-col gap-2">
          <h3 className="text-[13px] font-semibold text-muted">Who</h3>
          <ChoiceCards
            label="Who"
            value={audienceKind}
            onChange={setAudienceKind}
            choices={[
              { value: "all", label: "Every subscriber", description: `${formatNumber(activeSubscribers)} active right now.`, icon: Users },
              { value: "range", label: "Subscribed between", description: "Only people who signed up in a date range.", icon: UsersRound },
            ]}
          />
          {audienceKind === "range" && (
            <div className="glass-inset grid gap-3 p-3 sm:grid-cols-2">
              <Field label="From" htmlFor="audience-from" hint="Leave empty for the start.">
                <Input id="audience-from" type="date" value={from} max={to || undefined} onChange={(e) => setFrom(e.target.value)} />
              </Field>
              <Field label="To (inclusive)" htmlFor="audience-to" hint="Leave empty for today.">
                <Input id="audience-to" type="date" value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)} />
              </Field>
            </div>
          )}
        </section>

        <p className="flex items-center gap-2 rounded-2xl bg-primary-soft px-4 py-3 text-sm" aria-live="polite">
          <Users className="h-4 w-4 shrink-0 text-link" aria-hidden />
          <span>
            Goes to <strong className="num">{people}</strong>
            {mode === "now" ? (
              " now"
            ) : sendAt ? (
              <>
                {" "}on <strong>{formatLocalDateTime(sendAt)}</strong>
              </>
            ) : (
              " at the time you pick"
            )}
            .{mode === "schedule" && " The list is checked again when it goes out, so new sign-ups are included."}
          </span>
        </p>
        {error && (
          <p className="text-sm font-medium text-danger" role="alert">
            {error}
          </p>
        )}
      </div>
    </GlassDialog>
  );
}
