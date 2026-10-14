"use client";

import { Eye, MessageSquare, RefreshCw, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { addApplicationNote, deleteApplication, setApplicationStatus } from "@/app/actions/applications";
import { Button } from "@/components/admin/Button";
import { Field, Select, Textarea } from "@/components/admin/Field";
import { GlassPanel, PanelHeader } from "@/components/admin/Glass";
import { ConfirmDialog } from "@/components/admin/GlassDialog";
import { APPLICATION_STATUSES, type ApplicationEvent, type ApplicationStatus, STATUS_LABELS } from "@/lib/applications/types";
import { timeAgo } from "@/lib/utils";

function describe(event: ApplicationEvent): string {
  const who = event.userName ?? "Someone";
  if (event.kind === "cv_viewed") return `${who} opened the CV`;
  if (event.kind === "note") return `${who} added a note`;
  const to = event.toStatus ? STATUS_LABELS[event.toStatus] : "?";
  return `${who} moved it to ${to}`;
}

const ICONS = { cv_viewed: Eye, note: MessageSquare, status_changed: RefreshCw } as const;

/** Status, private notes and history for one application. The first time it's opened, a new application becomes Reviewed. */
export function ApplicationReview({
  id,
  name,
  status,
  events,
  submittedAt,
}: {
  id: string;
  name: string;
  status: ApplicationStatus;
  events: ApplicationEvent[];
  submittedAt: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [note, setNote] = useState("");
  const [noteError, setNoteError] = useState<string | null>(null);

  // "New" means nobody has looked yet, so the first visit moves it to Reviewed. Only ever once:
  // someone who later chooses "New" on purpose keeps it.
  const untouched = status === "new" && !events.some((e) => e.kind === "status_changed");
  const marked = useRef(false);
  useEffect(() => {
    if (!untouched || marked.current) return;
    marked.current = true;
    void setApplicationStatus(id, "reviewed").then(() => router.refresh());
  }, [id, untouched, router]);

  const changeStatus = (next: string) =>
    start(async () => {
      const result = await setApplicationStatus(id, next);
      (result.ok ? toast.success : toast.error)(result.message);
      router.refresh();
    });

  return (
    <>
      <GlassPanel>
        <PanelHeader title="Status" description="Only your team sees this. The candidate isn't notified." />
        <Field label="Where is this candidate?" htmlFor="application-status">
          <Select id="application-status" value={status} disabled={pending} onChange={(e) => changeStatus(e.target.value)}>
            {APPLICATION_STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABELS[s]}
              </option>
            ))}
          </Select>
        </Field>
        <div className="mt-3 flex flex-wrap gap-2">
          {(["shortlisted", "interviewing", "rejected"] as const)
            .filter((s) => s !== status)
            .map((s) => (
              <Button key={s} size="sm" variant={s === "rejected" ? "secondary" : "primary"} disabled={pending} onClick={() => changeStatus(s)}>
                {s === "shortlisted" ? "Shortlist" : s === "interviewing" ? "Interview" : "Not selected"}
              </Button>
            ))}
        </div>
      </GlassPanel>

      <GlassPanel>
        <PanelHeader title="Notes & history" />
        <form
          className="mb-4 flex flex-col gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            start(async () => {
              const result = await addApplicationNote(id, note);
              if (!result.ok) return setNoteError(result.message);
              setNote("");
              setNoteError(null);
              router.refresh();
            });
          }}
        >
          <Field label="Private note" htmlFor="application-note" error={noteError ? [noteError] : undefined}>
            <Textarea
              id="application-note"
              rows={3}
              maxLength={2000}
              value={note}
              invalid={Boolean(noteError)}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Strong portfolio. Call on Tuesday."
            />
          </Field>
          <Button type="submit" size="sm" disabled={pending || !note.trim()} className="self-start">
            Add note
          </Button>
        </form>
        <ol className="flex flex-col gap-3">
          {events.map((event) => {
            const Icon = ICONS[event.kind];
            return (
              <li key={event.id} className="flex gap-3 text-sm">
                <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted" aria-hidden />
                <div className="min-w-0">
                  <p>
                    {describe(event)}{" "}
                    {/* "5m ago" can tick over between the server render and the browser's. */}
                    <span className="text-xs text-muted" suppressHydrationWarning>
                      · {timeAgo(event.createdAt)}
                    </span>
                  </p>
                  {event.note && <p className="mt-1 whitespace-pre-line rounded-xl bg-inset px-3 py-2">{event.note}</p>}
                </div>
              </li>
            );
          })}
          <li className="flex gap-3 text-sm text-muted">
            <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" aria-hidden />
            <span suppressHydrationWarning>Applied on Career Reads · {timeAgo(submittedAt)}</span>
          </li>
        </ol>
      </GlassPanel>

      <ConfirmDialog
        trigger={
          <Button variant="danger" size="sm" className="self-start">
            <Trash2 /> Delete application
          </Button>
        }
        title={`Delete ${name}'s application?`}
        description="Their details, answers, CV and your notes are deleted for good."
        confirmLabel="Delete application"
        onConfirm={async () => {
          const result = await deleteApplication(id);
          if (!result.ok) toast.error(result.message);
        }}
      />
    </>
  );
}
