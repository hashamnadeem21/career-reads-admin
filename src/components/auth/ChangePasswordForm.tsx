"use client";

import { useActionState } from "react";
import { changePassword } from "@/app/actions/auth";
import { Button } from "@/components/admin/Button";
import { Field, Input } from "@/components/admin/Field";
import { initialFormState } from "@/lib/form-state";

export function ChangePasswordForm() {
  const [state, action, pending] = useActionState(changePassword, initialFormState);
  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      <Field label="Current password" htmlFor="current" error={state.errors?.current}>
        <Input id="current" name="current" type="password" autoComplete="current-password" required invalid={Boolean(state.errors?.current)} />
      </Field>
      <Field label="New password" htmlFor="next" error={state.errors?.next} hint="At least 12 characters, with a number or symbol.">
        <Input id="next" name="next" type="password" autoComplete="new-password" required invalid={Boolean(state.errors?.next)} />
      </Field>
      <Field label="Confirm new password" htmlFor="confirm" error={state.errors?.confirm}>
        <Input id="confirm" name="confirm" type="password" autoComplete="new-password" required invalid={Boolean(state.errors?.confirm)} />
      </Field>
      {state.message && (
        <p role="alert" className="rounded-xl bg-danger-soft px-3.5 py-2.5 text-sm font-medium text-danger">
          {state.message}
        </p>
      )}
      <Button type="submit" variant="primary" size="lg" disabled={pending} className="w-full">
        {pending ? "Saving…" : "Save new password"}
      </Button>
    </form>
  );
}
