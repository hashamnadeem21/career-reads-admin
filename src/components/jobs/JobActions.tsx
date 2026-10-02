"use client";

import { Copy, ExternalLink, EyeOff, Send, Trash2, TimerOff } from "lucide-react";
import { useTransition } from "react";
import { toast } from "sonner";
import { closeJobNow, deleteJob, duplicateJob, setJobStatus } from "@/app/actions/jobs";
import { Button } from "@/components/admin/Button";
import { ConfirmDialog } from "@/components/admin/GlassDialog";

/** Duplicate · Close now · Publish/Unpublish · Delete · View on site. */
export function JobActions({ slug, title, published, live, siteUrl }: { slug: string; title: string; published: boolean; live: boolean; siteUrl: string }) {
  const [pending, start] = useTransition();
  const run = (fn: () => Promise<{ message: string } | void>) =>
    start(async () => {
      const result = await fn();
      if (result) toast.success(result.message);
    });

  return (
    <div className="flex flex-wrap items-center gap-2">
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
      {published ? (
        <Button size="sm" disabled={pending} onClick={() => run(() => setJobStatus(slug, "draft"))}>
          <EyeOff /> Unpublish
        </Button>
      ) : (
        <Button size="sm" variant="primary" disabled={pending} onClick={() => run(() => setJobStatus(slug, "published"))}>
          <Send /> Publish
        </Button>
      )}
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
