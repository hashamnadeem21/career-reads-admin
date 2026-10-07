"use client";

import { Save } from "lucide-react";
import { useActionState, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { createCompany, updateCompany } from "@/app/actions/companies";
import { Button } from "@/components/admin/Button";
import { Field, Input, Switch } from "@/components/admin/Field";
import { initialFormState } from "@/lib/form-state";

export interface CompanyFormValues {
  id?: string;
  name: string;
  website: string;
  autoPublish: boolean;
}

/** Create (no `id`) or edit a company. */
export function CompanyForm({ initial, onDone }: { initial: CompanyFormValues; onDone?: () => void }) {
  const editing = Boolean(initial.id);
  const [state, action, pending] = useActionState(editing ? updateCompany : createCompany, initialFormState);
  const [autoPublish, setAutoPublish] = useState(initial.autoPublish);
  const err = (key: string) => state.errors?.[key];

  // React to each successful save exactly once (onDone may be a new function every render).
  const handled = useRef(state);
  useEffect(() => {
    if (handled.current === state || !state.ok) return;
    handled.current = state;
    if (state.message) toast.success(state.message);
    onDone?.();
  }, [state, onDone]);

  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      {initial.id && <input type="hidden" name="id" value={initial.id} />}
      {state.message && !state.ok && (
        <p role="alert" className="rounded-xl bg-danger-soft px-4 py-3 text-sm font-medium text-danger">
          {state.message}
        </p>
      )}
      <Field label="Company name" htmlFor="company-name" required error={err("name")} hint="Shown on every job they post.">
        <Input id="company-name" name="name" defaultValue={state.values?.name ?? initial.name} invalid={Boolean(err("name"))} autoFocus={!editing} />
      </Field>
      <Field label="Website" htmlFor="company-website" error={err("website")} hint="Optional, https://…">
        <Input
          id="company-website"
          name="website"
          type="url"
          inputMode="url"
          placeholder="https://"
          defaultValue={state.values?.website ?? initial.website}
          invalid={Boolean(err("website"))}
        />
      </Field>
      <Switch
        name="autoPublish"
        label="Trusted: publish without review"
        description="Off: every new or changed job waits for your approval. On: their jobs go live as soon as they publish."
        checked={autoPublish}
        onCheckedChange={setAutoPublish}
      />
      <Button type="submit" variant="primary" disabled={pending} className="self-start">
        <Save /> {pending ? "Saving…" : editing ? "Save changes" : "Create company"}
      </Button>
    </form>
  );
}
