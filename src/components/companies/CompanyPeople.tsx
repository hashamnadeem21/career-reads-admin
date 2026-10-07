"use client";

import { Check, Copy, Link2, Trash2, UserPlus, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { inviteCompanyUser } from "@/app/actions/companies";
import { removeUser, revokeInvite } from "@/app/actions/users";
import { Avatar } from "@/components/admin/Avatar";
import { Button } from "@/components/admin/Button";
import { EmptyState } from "@/components/admin/EmptyState";
import { Field, Input } from "@/components/admin/Field";
import { PanelHeader } from "@/components/admin/Glass";
import { ConfirmDialog, GlassDialog } from "@/components/admin/GlassDialog";
import { formatDate } from "@/lib/utils";

interface Member {
  id: string;
  name: string;
  email: string;
  createdAt: string;
}

interface Invite {
  email: string;
  name: string;
  expiresAt: string;
}

function InviteCompanyUser({ companyId, companyName, disabled }: { companyId: string; companyName: string; disabled: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [v, setV] = useState({ email: "", name: "" });
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
          setV({ email: "", name: "" });
          setErrors({});
        }
      }}
      trigger={
        <Button size="sm" variant="primary" disabled={disabled} title={disabled ? "Reactivate the company first" : undefined}>
          <UserPlus /> Invite
        </Button>
      }
      title={`Invite someone from ${companyName}`}
      description="They can post and edit this company's jobs and see their stats. Nothing else."
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
              const r = await inviteCompanyUser({ companyId, ...v });
              setErrors(r.errors ?? {});
              if (r.ok && r.link) {
                setLink(r.link);
                router.refresh();
              } else toast.error(r.message);
            });
          }}
        >
          <Field label="Name" htmlFor="company-invite-name" error={errors.name}>
            <Input id="company-invite-name" value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} invalid={Boolean(errors.name)} autoFocus />
          </Field>
          <Field label="Work email" htmlFor="company-invite-email" error={errors.email}>
            <Input
              id="company-invite-email"
              type="email"
              value={v.email}
              onChange={(e) => setV({ ...v, email: e.target.value })}
              invalid={Boolean(errors.email)}
            />
          </Field>
          <Button type="submit" variant="primary" disabled={pending}>
            {pending ? "Creating…" : "Create invite link"}
          </Button>
        </form>
      )}
    </GlassDialog>
  );
}

/** People who can sign in for this company, and pending invites. */
export function CompanyPeople({
  companyId,
  companyName,
  active,
  members,
  invites,
}: {
  companyId: string;
  companyName: string;
  active: boolean;
  members: Member[];
  invites: Invite[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const run = (fn: () => Promise<{ ok: boolean; message: string }>) =>
    start(async () => {
      const r = await fn();
      (r.ok ? toast.success : toast.error)(r.message);
      router.refresh();
    });

  return (
    <section className="glass rise-in p-5" aria-labelledby="company-people-title">
      <PanelHeader
        id="company-people-title"
        title="People"
        description="Company accounts only see this company's jobs and stats."
        actions={<InviteCompanyUser companyId={companyId} companyName={companyName} disabled={!active} />}
      />
      {members.length === 0 && invites.length === 0 ? (
        <EmptyState icon={Users} title="No one yet" description="Invite someone from the company so they can post jobs." />
      ) : (
        <ul className="flex flex-col gap-2">
          {members.map((m) => (
            <li key={m.id} className="glass-inset flex items-center gap-3 px-3 py-2.5">
              <Avatar name={m.name} size={32} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">{m.name}</span>
                <span className="block truncate text-xs text-muted">
                  {m.email} · joined {formatDate(m.createdAt)}
                </span>
              </span>
              <ConfirmDialog
                trigger={
                  <Button variant="ghost" size="icon" aria-label={`Remove ${m.name}`} disabled={pending}>
                    <Trash2 />
                  </Button>
                }
                title={`Remove ${m.name}?`}
                description="They're signed out and can no longer sign in. The company's jobs stay as they are."
                confirmLabel="Remove"
                onConfirm={() => run(() => removeUser(m.id))}
              />
            </li>
          ))}
          {invites.map((inv) => (
            <li key={inv.email} className="glass-inset flex flex-wrap items-center gap-3 px-3 py-2.5 text-sm">
              <span className="font-medium">{inv.name}</span>
              <span className="text-muted">{inv.email}</span>
              <span className="text-xs text-faint">Invited · expires {formatDate(inv.expiresAt)}</span>
              <Button size="sm" variant="ghost" className="ml-auto" disabled={pending} onClick={() => run(() => revokeInvite(inv.email))}>
                Revoke
              </Button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
