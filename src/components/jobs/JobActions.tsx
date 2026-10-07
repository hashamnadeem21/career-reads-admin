"use client";

import { Check, Copy, ExternalLink, EyeOff, Send, Trash2, TimerOff, Undo2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { approveJob, closeJobNow, deleteJob, duplicateJob, rejectJob, setJobStatus } from "@/app/actions/jobs";
import { Button } from "@/components/admin/Button";
import { Field, Textarea } from "@/components/admin/Field";
import { ConfirmDialog, GlassDialog } from "@/components/admin/GlassDialog";

/**
 * Duplicate · Close now · Publish/Unpublish · Delete · View on site.
 * `reviewing`: staff see Approve / Send back for a job waiting for review.
 * `needsReview`: a company that isn't trusted sees "Submit for review" instead of "Publish".
 */
export function JobActions({
  slug,
  title,
  published,
  live,
  siteUrl,
  reviewing = false,
  inReview = false,
  needsReview = false,
}: {
  slug: string;
  title: string;
  published: boolean;
  live: boolean;
  siteUrl: string;
  reviewing?: boolean;
  inReview?: boolean;
  needsReview?: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const run = (fn: () => Promise<{ ok?: boolean; message: string } | void>) =>
    start(async () => {
      const result = await fn();
      if (result) (result.ok === false ? toast.error : toast.success)(result.message);
      router.refresh();
    });

  return (
    <div className="flex flex-wrap items-center gap-2">
      {reviewing && (
        <>
          <Button size="sm" variant="primary" disabled={pending} onClick={() => run(() => approveJob(slug))}>
            <Check /> Approve & publish
          </Button>
          <SendBackDialog slug={slug} disabled={pending} />
        </>
      )}
      {live && (
        <Button asChild size="sm">
          <a href={siteUrl} target="_blank" rel="noopener noreferrer">
            <ExternalLink /> View on site
          </a>
        </Button>
      )}
      <Button size="sm" disabled={pending} onClick={() => run(() => duplicateJob(slug))}>
        <Copy /> Duplicate
      </Button>
      {live && (
        <ConfirmDialog
          trigger={
            <Button size="sm" disabled={pending}>
              <TimerOff /> Close now
            </Button>
          }
          title="Close applications now?"
          description="The deadline moves to yesterday and the job leaves the site right away. You can extend the deadline later."
          confirmLabel="Close job"
          tone="primary"
          onConfirm={() => run(() => closeJobNow(slug))}
        />
      )}
      {published || inReview ? (
        <Button size="sm" disabled={pending} onClick={() => run(() => setJobStatus(slug, "draft"))}>
          <EyeOff /> {inReview ? "Withdraw" : "Unpublish"}
        </Button>
      ) : !reviewing ? (
        <Button size="sm" variant="primary" disabled={pending} onClick={() => run(() => setJobStatus(slug, "published"))}>
          <Send /> {needsReview ? "Submit for review" : "Publish"}
        </Button>
      ) : null}
      <ConfirmDialog
        trigger={
          <Button size="sm" variant="danger" disabled={pending}>
            <Trash2 /> Delete
          </Button>
        }
        title={`Delete "${title}"?`}
        description="This removes the job and its stats for good. To hide it but keep it, unpublish instead."
        confirmLabel="Delete job"
        onConfirm={() => deleteJob(slug)}
      />
    </div>
  );
}

/** Staff: return a job to the company with a note saying what to change. */
function SendBackDialog({ slug, disabled }: { slug: string; disabled: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <GlassDialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) setError(null);
      }}
      trigger={
        <Button size="sm" disabled={disabled}>
          <Undo2 /> Send back
        </Button>
      }
      title="Send back to the company"
      description="The job stays hidden. The company sees your note and can edit and resubmit."
      footer={
        <Button
          variant="primary"
          disabled={pending}
          onClick={() =>
            start(async () => {
              const result = await rejectJob(slug, note);
              if (!result.ok) return setError(result.message);
              toast.success(result.message);
              setOpen(false);
              setNote("");
              router.refresh();
            })
          }
        >
          {pending ? "Sending…" : "Send back"}
        </Button>
      }
    >
      <Field label="What should they change?" htmlFor="review-note" error={error ? [error] : undefined}>
        <Textarea
          id="review-note"
          rows={4}
          maxLength={500}
          value={note}
          invalid={Boolean(error)}
          onChange={(e) => setNote(e.target.value)}
          placeholder="For example: please add the salary range and a direct apply link."
        />
      </Field>
    </GlassDialog>
  );
}
