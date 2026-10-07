"use client";

import { Check, Copy, Link2, Trash2, UserPlus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { changeRole, inviteUser, removeUser, revokeInvite } from "@/app/actions/users";
import { Avatar } from "@/components/admin/Avatar";
import { Badge } from "@/components/admin/Badge";
import { Button } from "@/components/admin/Button";
import { Field, Input, Select } from "@/components/admin/Field";
import { ConfirmDialog, GlassDialog } from "@/components/admin/GlassDialog";
import { roleLabels } from "@/lib/auth/roles";
import { formatDate } from "@/lib/utils";

type StaffRole = "super_admin" | "editor";

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: StaffRole;
  createdAt: string;
  isYou: boolean;
}

export interface PendingInvite {
  email: string;
  name: string;
  role: StaffRole;
  expiresAt: string;
}

function InviteDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [v, setV] = useState({ email: "", name: "", role: "editor" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [link, setLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [pending, start] = useTransition();

  return (
    <GlassDialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) {
          setLink(null);
          setV({ email: "", name: "", role: "editor" });
          setErrors({});
        }
      }}
      trigger={
        <Button variant="primary">
          <UserPlus /> Invite
        </Button>
      }
      title="Invite a team member"
      description="They get a one-time link (valid 7 days) to choose their own password."
    >
      {link ? (
        <div className="flex flex-col gap-3">
          <p className="text-sm">Send this link to {v.name}. It works once and expires in 7 days.</p>
          <div className="glass-inset flex items-center gap-2 p-2">
            <Link2 className="h-4 w-4 shrink-0 text-muted" aria-hidden />
            <input readOnly value={link} aria-label="Invite link" className="min-w-0 flex-1 bg-transparent text-xs outline-none" onFocus={(e) => e.target.select()} />
            <Button
              size="sm"
              onClick={async () => {
                await navigator.clipboard.writeText(link);
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              }}
            >
              {copied ? <Check /> : <Copy />} {copied ? "Copied" : "Copy"}
            </Button>
          </div>
        </div>
      ) : (
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            start(async () => {
              const r = await inviteUser(v);
              setErrors(r.errors ?? {});
              if (r.ok && r.link) {
                setLink(r.link);
                router.refresh();
              } else toast.error(r.message);
            });
          }}
        >
          <Field label="Name" htmlFor="invite-name" error={errors.name}>
            <Input id="invite-name" value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} invalid={Boolean(errors.name)} autoFocus />
          </Field>
          <Field label="Email" htmlFor="invite-email" error={errors.email}>
            <Input id="invite-email" type="email" value={v.email} onChange={(e) => setV({ ...v, email: e.target.value })} invalid={Boolean(errors.email)} />
          </Field>
          <Field label="Role" htmlFor="invite-role" hint="Editors write and publish posts and jobs. Super admins can also manage companies, settings and users.">
            <Select id="invite-role" value={v.role} onChange={(e) => setV({ ...v, role: e.target.value })}>
              <option value="editor">Editor</option>
              <option value="super_admin">Super admin</option>
            </Select>
          </Field>
          <Button type="submit" variant="primary" disabled={pending}>
            {pending ? "Creating…" : "Create invite link"}
          </Button>
        </form>
      )}
    </GlassDialog>
  );
}

/** Avatar cards with role badges (Super admin = blue, Editor = amber). */
export function UsersManager({ members, invites }: { members: TeamMember[]; invites: PendingInvite[] }) {
  const router = useRouter();
  const [, start] = useTransition();
  const adminCount = members.filter((m) => m.role === "super_admin").length;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-end">
        <InviteDialog />
      </div>
      <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3" aria-label="Team members">
        {members.map((m, i) => {
          const lastAdmin = m.role === "super_admin" && adminCount === 1;
          return (
            <li key={m.id} className="glass lift rise-in flex flex-col gap-4 p-5" style={{ "--stagger": i } as React.CSSProperties}>
              <div className="flex items-center gap-3">
                <Avatar name={m.name} size={48} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">
                    {m.name} {m.isYou && <span className="text-xs font-normal text-muted">(you)</span>}
                  </p>
                  <p className="truncate text-xs text-muted">{m.email}</p>
                </div>
                <Badge tone={m.role === "super_admin" ? "info" : "warning"}>{roleLabels[m.role]}</Badge>
              </div>
              <p className="text-xs text-faint">Joined {formatDate(m.createdAt)}</p>
              <div className="mt-auto flex items-center gap-2">
                <Select
                  aria-label={`Role for ${m.name}`}
                  value={m.role}
                  disabled={lastAdmin}
                  title={lastAdmin ? "There must always be at least one super admin" : undefined}
                  onChange={(e) =>
                    start(async () => {
                      const r = await changeRole(m.id, e.target.value);
                      (r.ok ? toast.success : toast.error)(r.message);
                      router.refresh();
                    })
                  }
                >
                  <option value="editor">Editor</option>
                  <option value="super_admin">Super admin</option>
                </Select>
                <ConfirmDialog
                  trigger={
                    <Button variant="ghost" size="icon" aria-label={`Remove ${m.name}`} disabled={m.isYou || lastAdmin}>
                      <Trash2 />
                    </Button>
                  }
                  title={`Remove ${m.name}?`}
                  description="They are signed out everywhere and can no longer sign in. Their posts stay."
                  confirmLabel="Remove"
                  onConfirm={async () => {
                    const r = await removeUser(m.id);
                    (r.ok ? toast.success : toast.error)(r.message);
                    router.refresh();
                  }}
                />
              </div>
            </li>
          );
        })}
      </ul>
      {invites.length > 0 && (
        <section aria-labelledby="pending-title">
          <h2 id="pending-title" className="mb-3 text-base font-semibold">
            Pending invites
          </h2>
          <ul className="flex flex-col gap-2">
            {invites.map((inv) => (
              <li key={inv.email} className="glass-inset flex flex-wrap items-center gap-3 px-4 py-3 text-sm">
                <span className="font-medium">{inv.name}</span>
                <span className="text-muted">{inv.email}</span>
                <Badge tone={inv.role === "super_admin" ? "info" : "warning"}>{roleLabels[inv.role]}</Badge>
                <span className="text-xs text-faint">Expires {formatDate(inv.expiresAt)}</span>
                <Button
                  size="sm"
                  variant="ghost"
                  className="ml-auto"
                  onClick={() =>
                    start(async () => {
                      const r = await revokeInvite(inv.email);
                      toast.success(r.message);
                      router.refresh();
                    })
                  }
                >
                  Revoke
                </Button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
