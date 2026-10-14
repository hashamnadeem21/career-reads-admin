"use client";

import { UserX } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { forgetCandidate } from "@/app/actions/applications";
import { Button } from "@/components/admin/Button";
import { Field, Input } from "@/components/admin/Field";
import { GlassDialog } from "@/components/admin/GlassDialog";

/** Super admin: a candidate asked for their data to be deleted. Removes every application and CV for that email. */
export function ForgetCandidateDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
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
        <Button>
          <UserX /> Delete a person&apos;s data
        </Button>
      }
      title="Delete a candidate's data"
      description="For privacy requests. Deletes every application this person made, to every company, and their CVs. This can't be undone."
      footer={
        <Button
          variant="danger"
          disabled={pending || !email.trim()}
          onClick={() =>
            start(async () => {
              const result = await forgetCandidate(email.trim());
              if (!result.ok) return setError(result.message);
              toast.success(result.message);
              setOpen(false);
              setEmail("");
              router.refresh();
            })
          }
        >
          {pending ? "Deleting…" : "Delete everything"}
        </Button>
      }
    >
      <Field label="Their email address" htmlFor="forget-email" error={error ? [error] : undefined}>
        <Input
          id="forget-email"
          type="email"
          value={email}
          invalid={Boolean(error)}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="name@example.com"
        />
      </Field>
    </GlassDialog>
  );
}
