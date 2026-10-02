"use client";

import { CalendarClock, Copy, EyeOff, Send, Trash2 } from "lucide-react";
import { useState } from "react";
import { StatusPill, type ContentState } from "@/components/admin/Badge";
import { Button } from "@/components/admin/Button";
import { Field, Input, Switch } from "@/components/admin/Field";
import { ConfirmDialog } from "@/components/admin/GlassDialog";
import type { PostDraft, PostIntent } from "@/lib/posts/draft";
import { formatDate } from "@/lib/utils";

/** Status, publish/schedule/unpublish buttons, ads switch and delete. */
export function PublishPanel({
  draft,
  update,
  state,
  isNew,
  saving,
  onSave,
  onDuplicate,
  onDelete,
  scheduleError,
  siteHref,
}: {
  draft: PostDraft;
  update: (p: Partial<PostDraft>) => void;
  state: ContentState;
  isNew: boolean;
  saving: PostIntent | null;
  onSave: (intent: PostIntent, scheduleAt?: string) => void;
  onDuplicate: () => void;
  onDelete: () => Promise<void>;
  scheduleError?: string;
  siteHref: string;
}) {
  const [scheduleAt, setScheduleAt] = useState(() => {
    const d = new Date(Date.now() + 86_400_000);
    d.setMinutes(0, 0, 0);
    return new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
  });
  const published = draft.status === "published";

  return (
    <div className="flex flex-col gap-5">
      <div className="glass-inset flex flex-col gap-2 p-3 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-muted">Status</span>
          <StatusPill state={isNew ? "draft" : state} />
        </div>
        {!isNew && draft.publishedAt && (
          <div className="flex items-center justify-between">
            <span className="text-muted">{state === "scheduled" ? "Goes live" : published ? "Published" : "Date"}</span>
            <span>{formatDate(draft.publishedAt)}</span>
          </div>
        )}
        {state === "live" && (
          <a href={siteHref} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-primary hover:underline">
            View on site ↗
          </a>
        )}
      </div>

      <div className="flex flex-col gap-2">
        {published ? (
          <Button variant="primary" disabled={Boolean(saving)} onClick={() => onSave("update")}>
            <Send /> {saving === "update" ? "Publishing…" : state === "scheduled" ? "Save schedule changes" : "Update live post"}
          </Button>
        ) : (
          <Button variant="primary" disabled={Boolean(saving)} onClick={() => onSave("publish")}>
            <Send /> {saving === "publish" ? "Publishing…" : "Publish now"}
          </Button>
        )}
        {!published && (
          <Button disabled={Boolean(saving)} onClick={() => onSave("draft")}>
            {saving === "draft" ? "Saving…" : "Save draft"}
          </Button>
        )}
        {published && (
          <Button disabled={Boolean(saving)} onClick={() => onSave("unpublish")}>
            <EyeOff /> {saving === "unpublish" ? "Unpublishing…" : "Unpublish"}
          </Button>
        )}
      </div>

      <fieldset className="flex flex-col gap-2 border-t border-divider pt-4">
        <legend className="mb-2 text-sm font-semibold">Schedule</legend>
        <Field label="Publish on (your local time)" htmlFor="scheduleAt" error={scheduleError}>
          <Input id="scheduleAt" type="datetime-local" value={scheduleAt} onChange={(e) => setScheduleAt(e.target.value)} invalid={Boolean(scheduleError)} />
        </Field>
        <Button disabled={Boolean(saving) || !scheduleAt} onClick={() => onSave("schedule", new Date(scheduleAt).toISOString())}>
          <CalendarClock /> {saving === "schedule" ? "Scheduling…" : "Schedule"}
        </Button>
      </fieldset>

      <div className="border-t border-divider pt-4">
        <Switch label="Show ads on this post" description="Turn off for sensitive topics" checked={draft.ads} onCheckedChange={(v) => update({ ads: v })} />
      </div>

      {!isNew && (
        <div className="flex flex-wrap gap-2 border-t border-divider pt-4">
          <Button size="sm" onClick={onDuplicate}>
            <Copy /> Duplicate
          </Button>
          <ConfirmDialog
            trigger={
              <Button size="sm" variant="danger">
                <Trash2 /> Delete
              </Button>
            }
            title="Delete this post?"
            description={published ? "It disappears from the site immediately and can't be restored. Unpublish instead to keep it as a draft." : "The draft is removed for good."}
            confirmLabel="Delete post"
            onConfirm={onDelete}
          />
        </div>
      )}
    </div>
  );
}
