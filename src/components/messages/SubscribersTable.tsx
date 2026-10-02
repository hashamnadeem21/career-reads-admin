"use client";

import { Download, Trash2, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { deleteSubscribers } from "@/app/actions/messages";
import { Badge } from "@/components/admin/Badge";
import { Button } from "@/components/admin/Button";
import { EmptyState } from "@/components/admin/EmptyState";
import { Checkbox } from "@/components/admin/Field";
import { ConfirmDialog } from "@/components/admin/GlassDialog";
import { formatDate } from "@/lib/utils";

export interface SubscriberRow {
  id: number;
  email: string;
  confirmed: boolean;
  createdAt: string;
}

export function SubscribersTable({ rows, total }: { rows: SubscriberRow[]; total: number }) {
  const router = useRouter();
  const [selected, setSelected] = useState<number[]>([]);
  if (rows.length === 0) {
    return <EmptyState icon={Users} title="No subscribers yet" description="Newsletter sign-ups from the site appear here." />;
  }
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="num text-sm text-muted">{total.toLocaleString()} subscribers</p>
        <div className="flex gap-2">
          {selected.length > 0 && (
            <ConfirmDialog
              trigger={
                <Button size="sm" variant="danger">
                  <Trash2 /> Remove {selected.length}
                </Button>
              }
              title={`Remove ${selected.length} subscriber${selected.length === 1 ? "" : "s"}?`}
              description="Use this for unsubscribe requests. It can't be undone."
              confirmLabel="Remove"
              onConfirm={async () => {
                const r = await deleteSubscribers(selected);
                (r.ok ? toast.success : toast.error)(r.message);
                setSelected([]);
                router.refresh();
              }}
            />
          )}
          <Button asChild size="sm">
            <a href="/api/export/subscribers" download>
              <Download /> Export CSV
            </a>
          </Button>
        </div>
      </div>
      <table className="w-full border-separate border-spacing-0 text-sm">
        <thead>
          <tr className="text-left text-xs text-muted">
            <th className="w-10 rounded-l-xl bg-inset px-3 py-2.5">
              <Checkbox aria-label="Select all" checked={selected.length === rows.length} onCheckedChange={(v) => setSelected(v ? rows.map((r) => r.id) : [])} />
            </th>
            <th className="bg-inset px-3 py-2.5 font-medium">Email</th>
            <th className="hidden bg-inset px-3 py-2.5 font-medium sm:table-cell">Status</th>
            <th className="rounded-r-xl bg-inset px-3 py-2.5 font-medium">Subscribed</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="group">
              <td className="px-3 py-2.5 group-hover:bg-hover">
                <Checkbox aria-label={`Select ${r.email}`} checked={selected.includes(r.id)} onCheckedChange={(v) => setSelected((s) => (v ? [...s, r.id] : s.filter((x) => x !== r.id)))} />
              </td>
              <td className="max-w-0 truncate px-3 py-2.5 font-medium group-hover:bg-hover">{r.email}</td>
              <td className="hidden px-3 py-2.5 group-hover:bg-hover sm:table-cell">
                <Badge tone={r.confirmed ? "success" : "neutral"}>{r.confirmed ? "Confirmed" : "Pending"}</Badge>
              </td>
              <td className="whitespace-nowrap px-3 py-2.5 text-muted group-hover:bg-hover">{formatDate(r.createdAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
