import { Badge, type Tone } from "@/components/admin/Badge";
import type { NewsletterStatus as Status } from "@/lib/api/types";

const tone: Record<Status, Tone> = { draft: "warning", scheduled: "info", sending: "info", sent: "success" };
const label: Record<Status, string> = { draft: "Draft", scheduled: "Scheduled", sending: "Sending…", sent: "Sent" };

/** Draft = amber, Scheduled / Sending = blue, Sent = green (same colours as the other status pills). */
export function NewsletterStatus({ status, className }: { status: Status; className?: string }) {
  return (
    <Badge tone={tone[status]} dot className={className}>
      {label[status]}
    </Badge>
  );
}
