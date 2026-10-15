"use client";

import { Building2, CheckCircle2, XCircle } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { type ApproveState, approveCompanyRequest, rejectCompanyRequest } from "@/app/actions/company-requests";
import { Button, buttonClasses } from "@/components/admin/Button";
import { Checkbox, Field, Input, Switch, Textarea } from "@/components/admin/Field";
import { PanelHeader } from "@/components/admin/Glass";
import { GlassDialog } from "@/components/admin/GlassDialog";
import { InviteSent } from "@/components/users/InviteSent";
import type { CompanyRequestDetail } from "@/lib/company-requests/types";
import { initialFormState } from "@/lib/form-state";

type Request = CompanyRequestDetail["request"];

/**
 * Approve (sets the company up and invites the contact) or turn down a waiting request. The form
 * starts from what they typed, so the reviewer can tidy the name or use a different email.
 *
 * Rendered for decided requests too (showing `decided`), so that after approving, when the page
 * refreshes to "approved", this stays mounted and keeps the one-time invite link on screen.
 */
export function ReviewRequest({ request, decided }: { request: Request; decided?: React.ReactNode }) {
  const [state, approve, approving] = useActionState<ApproveState, FormData>(approveCompanyRequest, initialFormState);
  const [autoPublish, setAutoPublish] = useState(false);
  const [onsiteApply, setOnsiteApply] = useState(true);
  const err = (key: string) => state.errors?.[key];
  const value = (key: string, fallback: string) => state.values?.[key] ?? fallback;

  if (state.ok && state.invite && state.companyId) {
    return (
      <section className="glass rise-in p-5" aria-labelledby="approved-title">
        <PanelHeader id="approved-title" title="Approved" description={state.message} />
        <InviteSent name={value("contactName", request.contactName)} email={value("contactEmail", request.contactEmail)} {...state.invite} />
        <Link href={`/companies/${state.companyId}`} className={`${buttonClasses()} mt-4`}>
          <Building2 /> Open the company
        </Link>
      </section>
    );
  }
  if (request.status !== "pending") return decided;

  return (
    <section className="glass rise-in p-5" aria-labelledby="review-title">
      <PanelHeader
        id="review-title"
        title="Review"
        description="Approving creates the company and emails the contact a one-time link to set their password. They can then post this company's jobs and review its applicants."
        actions={<RejectDialog request={request} />}
      />
      <form action={approve} className="flex flex-col gap-4" noValidate>
        <input type="hidden" name="id" value={request.id} />
        {state.message && !state.ok && (
          <p role="alert" className="rounded-xl bg-danger-soft px-4 py-3 text-sm font-medium text-danger">
            {state.message}
          </p>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Company name" htmlFor="approve-company" required error={err("companyName")} hint="Shown on every job they post.">
            <Input id="approve-company" name="companyName" defaultValue={value("companyName", request.companyName)} invalid={Boolean(err("companyName"))} />
          </Field>
          <Field label="Website" htmlFor="approve-website" error={err("website")}>
            <Input
              id="approve-website"
              name="website"
              type="url"
              inputMode="url"
              placeholder="https://"
              defaultValue={value("website", request.website ?? "")}
              invalid={Boolean(err("website"))}
            />
          </Field>
          <Field label="Contact name" htmlFor="approve-name" required error={err("contactName")}>
            <Input id="approve-name" name="contactName" defaultValue={value("contactName", request.contactName)} invalid={Boolean(err("contactName"))} />
          </Field>
          <Field label="Invite this email" htmlFor="approve-email" required error={err("contactEmail")} hint="Gets the company's first admin account.">
            <Input
              id="approve-email"
              name="contactEmail"
              type="email"
              defaultValue={value("contactEmail", request.contactEmail)}
              invalid={Boolean(err("contactEmail"))}
            />
          </Field>
        </div>
        <Switch
          name="onsiteApplyEnabled"
          label="Applications on Career Reads"
          description="Candidates apply with a CV on the site and the company reviews them under Applicants. Recommended."
          checked={onsiteApply}
          onCheckedChange={setOnsiteApply}
        />
        <Switch
          name="autoPublish"
          label="Trusted: publish without review"
          description="Off: you approve each job before it goes live. Leave it off for new companies."
          checked={autoPublish}
          onCheckedChange={setAutoPublish}
        />
        <Button type="submit" variant="primary" disabled={approving} className="self-start">
          <CheckCircle2 /> {approving ? "Approving…" : "Approve and send invite"}
        </Button>
      </form>
    </section>
  );
}

function RejectDialog({ request }: { request: Request }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [state, reject, rejecting] = useActionState(rejectCompanyRequest, initialFormState);

  // React to each successful decision exactly once.
  const handled = useRef(state);
  useEffect(() => {
    if (handled.current === state || !state.ok) return;
    handled.current = state;
    if (state.message) toast.success(state.message);
    setOpen(false);
    router.refresh();
  }, [state, router]);

  return (
    <GlassDialog
      open={open}
      onOpenChange={setOpen}
      trigger={
        <Button size="sm" variant="secondary">
          <XCircle /> Turn down
        </Button>
      }
      title={`Turn down ${request.companyName}?`}
      description="They can send a new request later. Nothing is created."
    >
      <form action={reject} className="flex flex-col gap-4" noValidate>
        <input type="hidden" name="id" value={request.id} />
        {state.message && !state.ok && (
          <p role="alert" className="rounded-xl bg-danger-soft px-4 py-3 text-sm font-medium text-danger">
            {state.message}
          </p>
        )}
        <Field label="Reason" htmlFor="reject-reason" error={state.errors?.reason} hint="Optional. Included in the email, so write it to them.">
          <Textarea id="reject-reason" name="reason" rows={4} defaultValue={state.values?.reason} placeholder="We couldn't verify your company's website." />
        </Field>
        <Checkbox name="notify" defaultChecked label={`Email ${request.contactName} to let them know`} />
        <Button type="submit" variant="danger" disabled={rejecting} className="self-start">
          {rejecting ? "Saving…" : "Turn down request"}
        </Button>
      </form>
    </GlassDialog>
  );
}
