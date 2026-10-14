"use client";

import { AlertTriangle, Check, Copy, Link2, MailCheck } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/admin/Button";

/**
 * After an invite is created: whether it was emailed, and the one-time link with a Copy button
 * (to send another way too, or instead when the email couldn't go out).
 */
export function InviteSent({
  name,
  email,
  link,
  emailed,
  emailError,
}: {
  name: string;
  email: string;
  link: string;
  emailed: boolean;
  emailError?: string;
}) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex flex-col gap-3">
      {emailed ? (
        <p role="status" className="flex items-start gap-2 rounded-xl bg-success-soft px-3 py-2.5 text-sm text-success">
          <MailCheck className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <span>
            Invite emailed to <strong>{email}</strong>. They choose a password from the email and are signed in.
          </span>
        </p>
      ) : (
        <p role="alert" className="flex items-start gap-2 rounded-xl bg-accent-soft px-3 py-2.5 text-sm text-accent">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <span>
            The email couldn&apos;t be sent{emailError ? ` (${emailError})` : ""}. Copy the link below and send it to {name} yourself.
          </span>
        </p>
      )}
      <p className="text-sm text-muted">
        {emailed ? "You can also share this link yourself." : "The link"} It works once and expires in 7 days.
      </p>
      <div className="glass-inset flex items-center gap-2 p-2 focus-within:shadow-[0_0_0_4px_var(--primary-glow)]">
        <Link2 className="h-4 w-4 shrink-0 text-muted" aria-hidden />
        <input
          readOnly
          value={link}
          aria-label="Invite link"
          className="min-w-0 flex-1 bg-transparent text-xs outline-none focus-visible:shadow-none"
          onFocus={(e) => e.target.select()}
        />
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
  );
}
