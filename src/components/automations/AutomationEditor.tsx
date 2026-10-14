"use client";

import { Clock, Save, Trash2, Zap } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useState, useTransition } from "react";
import { toast } from "sonner";
import { type AutomationInput, deleteAutomation, saveAutomation, sendTestAutomation } from "@/app/actions/automations";
import { Button } from "@/components/admin/Button";
import { ChoiceCards } from "@/components/admin/ChoiceCards";
import { Field, Input, Select } from "@/components/admin/Field";
import { GlassPanel, PageHeader, PanelHeader } from "@/components/admin/Glass";
import { ConfirmDialog } from "@/components/admin/GlassDialog";
import { LocalTime } from "@/components/admin/LocalTime";
import { EmailFields } from "@/components/newsletters/EmailFields";
import { EmailPreview } from "@/components/newsletters/EmailPreview";
import { TestSendDialog } from "@/components/newsletters/SendDialogs";
import { useLivePreview, useSaveShortcut, useUnsavedWarning } from "@/components/newsletters/use-email-editor";
import { type DelayUnit, describeTrigger, joinDelay, splitDelay } from "@/lib/automations/delay";
import { fromLocalInput, toLocalInput } from "@/lib/local-time";
import { ActiveSwitch } from "./ActiveSwitch";
import { AutomationStatus } from "./AutomationStatus";
import { emailContentOf } from "@/lib/newsletters/email-content";

/** What the form edits. Dates are local "2026-10-14T09:00" strings, turned into ISO on save. */
interface FormValues {
  name: string;
  delayed: "now" | "later";
  delayAmount: string;
  delayUnit: DelayUnit;
  startsAt: string;
  endsAt: string;
  subject: string;
  previewText: string;
  body: string;
  heroImage: string;
  ctaLabel: string;
  ctaUrl: string;
}

export interface AutomationInitial {
  name: string;
  delayMinutes: number;
  startsAt: string | null;
  endsAt: string | null;
  subject: string;
  previewText: string;
  body: string;
  heroImage: string;
  ctaLabel: string;
  ctaUrl: string;
}

function toForm(a: AutomationInitial): FormValues {
  const { amount, unit } = splitDelay(a.delayMinutes);
  return {
    name: a.name,
    delayed: a.delayMinutes > 0 ? "later" : "now",
    delayAmount: a.delayMinutes > 0 ? String(amount) : "1",
    delayUnit: a.delayMinutes > 0 ? unit : "days",
    startsAt: toLocalInput(a.startsAt),
    endsAt: toLocalInput(a.endsAt),
    ...emailContentOf(a),
  };
}

function delayMinutes(v: FormValues): number {
  return v.delayed === "now" ? 0 : joinDelay(Math.max(0, Number(v.delayAmount) || 0), v.delayUnit);
}

function toInput(v: FormValues): AutomationInput {
  return {
    name: v.name,
    trigger: "subscribed",
    delayMinutes: delayMinutes(v),
    ...emailContentOf(v),
    startsAt: fromLocalInput(v.startsAt),
    endsAt: fromLocalInput(v.endsAt),
  };
}

/**
 * Write an automation: when it fires (trigger, delay, launch and end dates) and the email it sends,
 * with a live preview. Super admins switch it on from here; pending edits are saved first.
 */
export function AutomationEditor({
  id: initialId,
  initial,
  initialHtml,
  active,
  sendingReady,
  canToggle,
  userEmail,
  siteOrigin,
}: {
  id: number | null;
  initial: AutomationInitial;
  initialHtml: string | null;
  active: boolean;
  sendingReady: boolean;
  canToggle: boolean;
  userEmail: string;
  /** The website's origin, to show media-library images (stored as site paths). */
  siteOrigin: string;
}) {
  const router = useRouter();
  const [id, setId] = useState(initialId);
  const [values, setValues] = useState(() => toForm(initial));
  const [saved, setSaved] = useState(() => JSON.stringify(toInput(toForm(initial))));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, startSaving] = useTransition();
  const dirty = id === null || JSON.stringify(toInput(values)) !== saved;
  const preview = useLivePreview(values, {
    content: emailContentOf(initial),
    html: initialHtml,
  });
  useUnsavedWarning(dirty);

  const set =
    <K extends keyof FormValues>(key: K) =>
    (value: FormValues[K]) =>
      setValues((v) => ({ ...v, [key]: value }));

  /** Saves if needed; returns the id, or null when the save failed (errors are shown). */
  const ensureSaved = useCallback(async (): Promise<number | null> => {
    if (!dirty && id) return id;
    const input = toInput(values);
    const result = await saveAutomation(id, input);
    setErrors(result.errors ?? {});
    if (!result.ok || !result.id) {
      toast.error(result.message);
      return null;
    }
    setSaved(JSON.stringify(input));
    if (id === null) {
      setId(result.id);
      router.replace(`/automations/${result.id}`, { scroll: false });
    }
    return result.id;
  }, [dirty, id, values, router]);

  const save = () =>
    startSaving(async () => {
      if ((await ensureSaved()) !== null) toast.success("Automation saved.");
    });
  useSaveShortcut(save);

  const minutes = delayMinutes(values);
  const launch = fromLocalInput(values.startsAt);
  const end = fromLocalInput(values.endsAt);

  return (
    <>
      <PageHeader
        title={
          <span className="flex flex-wrap items-center gap-3">
            {id ? values.name || "Untitled automation" : "New automation"} {id && <AutomationStatus active={active} />}
          </span>
        }
        description={
          !id
            ? "Set when it fires and write the email. It starts switched off."
            : active
              ? "It's on: new subscribers get this email automatically. Edits apply to emails not sent yet."
              : canToggle
                ? "Send yourself a test, then switch it on."
                : "Write and test it here. A super admin switches it on."
        }
        actions={
          <>
            {id && (
              <ConfirmDialog
                trigger={
                  <Button variant="ghost" size="icon" aria-label="Delete automation">
                    <Trash2 />
                  </Button>
                }
                title="Delete this automation?"
                description="Emails still waiting to go out won't be sent. This can't be undone."
                onConfirm={async () => {
                  const result = await deleteAutomation(id);
                  (result.ok ? toast.success : toast.error)(result.message);
                  if (result.ok) {
                    setSaved(JSON.stringify(toInput(values))); // nothing left to warn about
                    router.push("/automations");
                  }
                }}
              />
            )}
            <Button onClick={save} disabled={saving || !dirty}>
              <Save /> {saving ? "Saving…" : dirty ? "Save" : "Saved"}
            </Button>
            <TestSendDialog ensureSaved={ensureSaved} send={sendTestAutomation} defaultEmail={userEmail} disabled={!sendingReady} />
            {id && canToggle && (
              <div className="glass-inset rounded-xl px-3 py-1.5">
                <ActiveSwitch
                  id={id}
                  active={active}
                  disabled={!sendingReady && !active}
                  beforeChange={async () => (await ensureSaved()) !== null}
                />
              </div>
            )}
          </>
        }
      />

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="flex min-w-0 flex-col gap-5">
          <GlassPanel className="rise-in flex flex-col gap-5">
            <PanelHeader
              title="When it's sent"
              description={
                <>
                  {describeTrigger("subscribed", minutes)}
                  {launch && (
                    <>
                      , from <LocalTime date={launch} />
                    </>
                  )}
                  {end && (
                    <>
                      , until <LocalTime date={end} />
                    </>
                  )}
                  . Each person gets it once.
                </>
              }
            />
            <Field label="Name" htmlFor="name" required error={errors.name} hint="Only you see this, e.g. “Welcome email”.">
              <Input id="name" value={values.name} onChange={(e) => set("name")(e.target.value)} invalid={Boolean(errors.name)} placeholder="Welcome email" />
            </Field>
            <Field label="Trigger" htmlFor="trigger">
              <Select id="trigger" value="subscribed" onChange={() => undefined}>
                <option value="subscribed">Someone subscribes to the newsletter</option>
              </Select>
            </Field>
            <div className="flex flex-col gap-2">
              <span className="text-[13px] font-medium text-muted">Send it</span>
              <ChoiceCards
                label="Send it"
                value={values.delayed}
                onChange={set("delayed")}
                choices={[
                  { value: "now", label: "Straight away", description: "Within a minute of the trigger.", icon: Zap },
                  { value: "later", label: "After a delay", description: "E.g. 3 days after they subscribe.", icon: Clock },
                ]}
              />
              {values.delayed === "later" && (
                <div className="glass-inset grid grid-cols-[minmax(0,8rem)_minmax(0,1fr)] gap-3 p-3">
                  <Field label="Wait" htmlFor="delay-amount" error={errors.delayMinutes}>
                    <Input
                      id="delay-amount"
                      type="number"
                      min={1}
                      value={values.delayAmount}
                      onChange={(e) => set("delayAmount")(e.target.value)}
                      invalid={Boolean(errors.delayMinutes)}
                    />
                  </Field>
                  <Field label="Unit" htmlFor="delay-unit">
                    <Select id="delay-unit" value={values.delayUnit} onChange={(e) => set("delayUnit")(e.target.value as DelayUnit)}>
                      <option value="minutes">minutes</option>
                      <option value="hours">hours</option>
                      <option value="days">days</option>
                    </Select>
                  </Field>
                </div>
              )}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Launch date" htmlFor="starts-at" hint="Optional. Only people who subscribe from then on." error={errors.startsAt}>
                <Input
                  id="starts-at"
                  type="datetime-local"
                  value={values.startsAt}
                  onChange={(e) => set("startsAt")(e.target.value)}
                  invalid={Boolean(errors.startsAt)}
                  suppressHydrationWarning
                />
              </Field>
              <Field label="End date" htmlFor="ends-at" hint="Optional. Stops queueing new emails after this." error={errors.endsAt}>
                <Input
                  id="ends-at"
                  type="datetime-local"
                  value={values.endsAt}
                  min={values.startsAt || undefined}
                  onChange={(e) => set("endsAt")(e.target.value)}
                  invalid={Boolean(errors.endsAt)}
                  suppressHydrationWarning
                />
              </Field>
            </div>
          </GlassPanel>

          <GlassPanel className="rise-in flex flex-col gap-5">
            <PanelHeader title="The email" />
            <EmailFields
              siteOrigin={siteOrigin}
              values={values}
              errors={errors}
              onChange={(key) => (value) => set(key)(value)}
              subjectPlaceholder="Welcome to Career Reads"
              previewPlaceholder="Thanks for subscribing. Here's what to expect."
              bodyPlaceholder={"## Welcome aboard!\n\nThanks for subscribing. Here's what you'll get…"}
            />
          </GlassPanel>
        </div>

        <GlassPanel className="rise-in xl:sticky xl:top-4 xl:self-start">
          <EmailPreview
            html={preview.html}
            pending={preview.pending}
            error={preview.error}
            subject={values.subject}
            previewText={values.previewText}
          />
        </GlassPanel>
      </div>
    </>
  );
}
