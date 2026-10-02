"use client";

import { useActionState } from "react";
import { acceptInvite } from "@/app/actions/users";
import { Button } from "@/components/admin/Button";
import { Field, Input } from "@/components/admin/Field";
import { initialFormState } from "@/lib/form-state";

export function AcceptInviteForm({ token, name }: { token: string; name: string }) {
  const [state, action, pending] = useActionState(acceptInvite, initialFormState);
  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      <input type="hidden" name="token" value={token} />
      <Field label="Your name" htmlFor="name" error={state.errors?.name}>
        <Input id="name" name="name" defaultValue={state.values?.name ?? name} autoComplete="name" invalid={Boolean(state.errors?.name)} />
      </Field>
      <Field label="Choose a password" htmlFor="password" error={state.errors?.password} hint="At least 12 characters, with a number or symbol.">
        <Input id="password" name="password" type="password" autoComplete="new-password" invalid={Boolean(state.errors?.password)} />
      </Field>
      <Field label="Confirm password" htmlFor="confirm" error={state.errors?.confirm}>
        <Input id="confirm" name="confirm" type="password" autoComplete="new-password" invalid={Boolean(state.errors?.confirm)} />
      </Field>
      {state.message && (
        <p role="alert" className="rounded-xl bg-danger-soft px-3.5 py-2.5 text-sm font-medium text-danger">
          {state.message}
        </p>
      )}
      <Button type="submit" variant="primary" size="lg" disabled={pending}>
        {pending ? "Creating your account…" : "Join BlogNest Admin"}
      </Button>
    </form>
  );
}
