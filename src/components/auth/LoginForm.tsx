"use client";

import { LogIn } from "lucide-react";
import { useActionState } from "react";
import { login } from "@/app/actions/auth";
import { Button } from "@/components/admin/Button";
import { Field, Input } from "@/components/admin/Field";
import { initialFormState } from "@/lib/form-state";

export function LoginForm({ next }: { next?: string }) {
  const [state, action, pending] = useActionState(login, initialFormState);
  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      {next && <input type="hidden" name="next" value={next} />}
      <Field label="Email" htmlFor="email" error={state.errors?.email}>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          required
          autoFocus
          defaultValue={state.values?.email}
          invalid={Boolean(state.errors?.email)}
        />
      </Field>
      <Field label="Password" htmlFor="password" error={state.errors?.password}>
        <Input id="password" name="password" type="password" autoComplete="current-password" required invalid={Boolean(state.errors?.password)} />
      </Field>
      {state.message && (
        <p role="alert" className="rounded-xl bg-danger-soft px-3.5 py-2.5 text-sm font-medium text-danger">
          {state.message}
        </p>
      )}
      <Button type="submit" variant="primary" size="lg" disabled={pending} className="mt-1 w-full">
        <LogIn /> {pending ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  );
}
