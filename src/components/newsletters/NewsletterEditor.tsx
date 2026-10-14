"use client";

import { CalendarClock, CalendarX, Save, Send, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useState, useTransition } from "react";
import { toast } from "sonner";
import {
  deleteNewsletter,
  type NewsletterInput,
  saveNewsletter,
  scheduleNewsletter,
  sendNewsletter,
  sendTestNewsletter,
  unscheduleNewsletter,
} from "@/app/actions/newsletters";
import { Button } from "@/components/admin/Button";
import { GlassPanel, PageHeader } from "@/components/admin/Glass";
import { ConfirmDialog } from "@/components/admin/GlassDialog";
import { LocalTime } from "@/components/admin/LocalTime";
import { AudienceSummary } from "./AudienceSummary";
import { EmailFields } from "./EmailFields";
import { EmailPreview } from "./EmailPreview";
import { NewsletterStatus } from "./NewsletterStatus";
import { type SendChoice, SendDialog, TestSendDialog } from "./SendDialogs";
import { useLivePreview, useSaveShortcut, useUnsavedWarning } from "./use-email-editor";
import { emailContentOf } from "@/lib/newsletters/email-content";

export interface ScheduleInfo {
  scheduledAt: Date;
  audienceFrom: Date | null;
  audienceTo: Date | null;
}

/**
 * Write a newsletter: subject, inbox preview line, Markdown body, and a live preview of the exact
 * email. Super admins send it now or schedule it, to everyone or to a sign-up date range. A
 * scheduled newsletter stays editable until it goes out.
 */
export function NewsletterEditor({
  id: initialId,
  initial,
  initialHtml,
  schedule,
  activeSubscribers,
  sendingReady,
  canSend,
  userEmail,
  siteOrigin,
}: {
  id: number | null;
  initial: NewsletterInput;
  initialHtml: string | null;
  /** Set when it's scheduled. */
  schedule: ScheduleInfo | null;
  activeSubscribers: number;
  sendingReady: boolean;
  /** Super admins send and schedule; editors draft and test. */
  canSend: boolean;
  userEmail: string;
  /** The website's origin, to show media-library images (stored as site paths). */
  siteOrigin: string;
}) {
  const router = useRouter();
  const [id, setId] = useState(initialId);
  const [values, setValues] = useState(initial);
  const [saved, setSaved] = useState(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, startSaving] = useTransition();
  const dirty = id === null || JSON.stringify(emailContentOf(values)) !== JSON.stringify(emailContentOf(saved));
  const preview = useLivePreview(values, { content: initial, html: initialHtml });
  useUnsavedWarning(dirty);

  const set = (key: keyof NewsletterInput) => (value: string) => setValues((v) => ({ ...v, [key]: value }));

  /** Saves if needed; returns the id, or null when the save failed (errors are shown). */
  const ensureSaved = useCallback(async (): Promise<number | null> => {
    if (!dirty && id) return id;
    const snapshot = values;
    const result = await saveNewsletter(id, snapshot);
    setErrors(result.errors ?? {});
    if (!result.ok || !result.id) {
      toast.error(result.message);
      return null;
    }
    setSaved(snapshot);
    if (id === null) {
      setId(result.id);
      router.replace(`/newsletters/${result.id}`, { scroll: false });
    }
    return result.id;
  }, [dirty, id, values, router]);

  const save = () =>
    startSaving(async () => {
      if ((await ensureSaved()) !== null) toast.success(schedule ? "Changes saved. It goes out as scheduled." : "Draft saved.");
    });
  useSaveShortcut(save);

  const send = async ({ mode, sendAt, audience }: SendChoice): Promise<boolean> => {
    const savedId = await ensureSaved();
    if (!savedId) return false;
    const result = mode === "now" ? await sendNewsletter(savedId, audience) : await scheduleNewsletter(savedId, sendAt ?? "", audience);
    (result.ok ? toast.success : toast.error)(result.errors?.sendAt ?? result.message);
    if (result.ok) router.refresh();
    return result.ok;
  };

  // No subscribers yet is fine for scheduling; the dialog stops "send now" to nobody.
  const sendDisabledReason = !sendingReady
    ? "Email sending isn't set up yet."
    : !values.body.trim()
      ? "Write the newsletter first."
      : null;

  return (
    <>
      <PageHeader
        title={
          <span className="flex flex-wrap items-center gap-3">
            {id ? values.subject || "Untitled newsletter" : "New newsletter"} <NewsletterStatus status={schedule ? "scheduled" : "draft"} />
          </span>
        }
        description={
          canSend
            ? sendDisabledReason ?? "Preview it, send yourself a test, then send it now or schedule it."
            : "Write and test it here. A super admin sends or schedules it."
        }
        actions={
          <>
            {id && (
              <ConfirmDialog
                trigger={
                  <Button variant="ghost" size="icon" aria-label="Delete newsletter">
                    <Trash2 />
                  </Button>
                }
                title={schedule ? "Delete this scheduled newsletter?" : "Delete this draft?"}
                description={schedule ? "It won't be sent. This can't be undone." : "It can't be undone."}
                onConfirm={async () => {
                  const result = await deleteNewsletter(id);
                  (result.ok ? toast.success : toast.error)(result.message);
                  if (result.ok) {
                    setSaved(values); // nothing left to warn about
                    router.push("/newsletters");
                  }
                }}
              />
            )}
            <Button onClick={save} disabled={saving || !dirty}>
              <Save /> {saving ? "Saving…" : dirty ? (schedule ? "Save changes" : "Save draft") : "Saved"}
            </Button>
            <TestSendDialog ensureSaved={ensureSaved} send={sendTestNewsletter} defaultEmail={userEmail} disabled={!sendingReady} />
            {canSend && (
              <SendDialog
                key={schedule?.scheduledAt.toISOString() ?? "draft"}
                subject={values.subject}
                activeSubscribers={activeSubscribers}
                initial={schedule ? { mode: "schedule", ...schedule } : undefined}
                onConfirm={send}
                trigger={
                  <Button variant="primary" disabled={sendDisabledReason !== null}>
                    {schedule ? <CalendarClock /> : <Send />} {schedule ? "Change schedule" : "Send or schedule"}
                  </Button>
                }
              />
            )}
          </>
        }
      />

      {schedule && id && <ScheduledBanner id={id} schedule={schedule} canSend={canSend} />}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <GlassPanel className="rise-in flex flex-col gap-5">
          <EmailFields values={values} errors={errors} onChange={set} siteOrigin={siteOrigin} />
        </GlassPanel>

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

/** "Goes out Wed 14 Oct, 9:00 to every subscriber", with a way to take it back. */
function ScheduledBanner({ id, schedule, canSend }: { id: number; schedule: ScheduleInfo; canSend: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <div role="status" className="rise-in mb-5 flex flex-wrap items-center gap-3 rounded-2xl bg-primary-soft px-4 py-3 text-sm">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-ink">
        <CalendarClock className="h-4 w-4" aria-hidden />
      </span>
      <p className="min-w-0 flex-1">
        <span className="font-semibold">
          Goes out <LocalTime date={schedule.scheduledAt} />
        </span>{" "}
        to <AudienceSummary from={schedule.audienceFrom} to={schedule.audienceTo} />.{" "}
        <span className="text-muted">You can keep editing until then.</span>
      </p>
      {canSend && (
        <Button
          size="sm"
          disabled={pending}
          onClick={() =>
            start(async () => {
              const result = await unscheduleNewsletter(id);
              (result.ok ? toast.success : toast.error)(result.message);
              router.refresh();
            })
          }
        >
          <CalendarX /> Unschedule
        </Button>
      )}
    </div>
  );
}
