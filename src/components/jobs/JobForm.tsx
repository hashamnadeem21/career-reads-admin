"use client";

import { Eye, Save } from "lucide-react";
import { useActionState, useState } from "react";
import { saveJob } from "@/app/actions/jobs";
import { Button } from "@/components/admin/Button";
import { Field, Input, Select, Switch, Textarea } from "@/components/admin/Field";
import { GlassPanel, PanelHeader } from "@/components/admin/Glass";
import { ListInput } from "@/components/admin/ListInput";
import { initialFormState } from "@/lib/form-state";
import { jobSlugFrom } from "@/lib/jobs/form";
import type { JobFormValues } from "@/lib/jobs/form-values";
import type { ContentState } from "@/components/admin/Badge";
import { cn } from "@/lib/utils";
import {
  EMPLOYMENT_TYPES,
  EXPERIENCE_LEVELS,
  WORK_MODELS,
  employmentTypeLabels,
  experienceLabels,
  workModelLabels,
} from "@/shared/jobs/categories";
import { JobPreviewCard } from "./JobPreviewCard";

export interface CompanyOption {
  id: string;
  name: string;
  website: string | null;
}

/**
 * Basics · Location & type · Details · How to apply · Publishing, with a live preview card.
 *
 * Staff pass `companies` (to pick which company account owns the job).
 * Company accounts pass `company`: the name is fixed, "Featured" is hidden, and unless
 * the company is trusted, publishing becomes "Submit for review".
 */
export function JobForm({
  initial,
  originalSlug,
  categories,
  companies,
  company,
  state: jobState,
}: {
  initial: JobFormValues;
  originalSlug?: string;
  categories: { slug: string; name: string }[];
  companies?: CompanyOption[];
  company?: { name: string; autoPublish: boolean };
  /** Current state of an existing job (for the "goes back to review" warning). */
  state?: ContentState;
}) {
  const isCompany = Boolean(company);
  const needsReview = isCompany && !company?.autoPublish;
  const [state, action, pending] = useActionState(saveJob, initialFormState);
  const [v, setV] = useState(initial);
  const [slugEdited, setSlugEdited] = useState(Boolean(originalSlug));
  const [applyBy, setApplyBy] = useState<"url" | "email">(initial.applyEmail && !initial.applyUrl ? "email" : "url");
  const err = (key: string) => state.errors?.[key];

  const set = <K extends keyof JobFormValues>(key: K, value: JobFormValues[K]) =>
    setV((prev) => {
      const next = { ...prev, [key]: value };
      if (!slugEdited && (key === "title" || key === "company")) next.slug = jobSlugFrom(next.title, next.company);
      return next;
    });

  const text = (key: keyof JobFormValues) => ({
    id: key,
    name: key,
    value: v[key] as string,
    invalid: Boolean(err(key)),
    onChange: (e: { target: { value: string } }) => set(key, e.target.value as never),
  });

  return (
    <form action={action} className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]" noValidate>
      {originalSlug && <input type="hidden" name="originalSlug" value={originalSlug} />}
      <div className="flex min-w-0 flex-col gap-5">
        {state.message && (
          <p role="alert" className="rounded-xl bg-danger-soft px-4 py-3 text-sm font-medium text-danger">
            {state.message}
          </p>
        )}

        <GlassPanel className="rise-in">
          <PanelHeader title="Basics" />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Job title" htmlFor="title" required error={err("title")} counter={{ value: v.title.length, max: 100, min: 4 }} className="sm:col-span-2">
              <Input {...text("title")} placeholder="Frontend Developer (React / Next.js)" />
            </Field>
            {company ? (
              <Field label="Company" htmlFor="company" hint="Set by your account. Ask Career Reads to change it.">
                <Input id="company" name="company" value={company.name} readOnly aria-readonly className="opacity-80" />
              </Field>
            ) : (
              <>
                {companies && companies.length > 0 && (
                  <Field
                    label="Company account"
                    htmlFor="companyId"
                    error={err("companyId")}
                    hint="Pick one if this job belongs to a company that has its own login. They'll see it and its stats."
                    className="sm:col-span-2"
                  >
                    <Select
                      id="companyId"
                      name="companyId"
                      value={v.companyId}
                      onChange={(e) => {
                        const picked = companies.find((c) => c.id === e.target.value);
                        set("companyId", e.target.value);
                        if (picked) {
                          set("company", picked.name);
                          if (!v.companyWebsite && picked.website) set("companyWebsite", picked.website);
                        }
                      }}
                    >
                      <option value="">None (posted by Career Reads)</option>
                      {companies.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </Select>
                  </Field>
                )}
                <Field label="Company" htmlFor="company" required error={err("company")} hint={v.companyId ? "Uses the company account's name" : undefined}>
                  <Input {...text("company")} readOnly={Boolean(v.companyId)} className={v.companyId ? "opacity-80" : undefined} />
                </Field>
              </>
            )}
            <Field label="Company website" htmlFor="companyWebsite" error={err("companyWebsite")} hint="Optional, https://…">
              <Input {...text("companyWebsite")} type="url" inputMode="url" placeholder="https://" />
            </Field>
            <Field label="URL slug" htmlFor="slug" error={err("slug")} hint={`Page address: /jobs/${v.slug || "…"}`} className="sm:col-span-2">
              <Input
                {...text("slug")}
                onChange={(e) => {
                  setSlugEdited(true);
                  set("slug", e.target.value.toLowerCase());
                }}
              />
            </Field>
          </div>
        </GlassPanel>

        <GlassPanel className="rise-in" style={{ "--stagger": 1 } as React.CSSProperties}>
          <PanelHeader title="Location & type" />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="City" htmlFor="city" error={err("city")} hint="Leave empty for fully remote roles">
              <Input {...text("city")} />
            </Field>
            <Field label="Country" htmlFor="country" required error={err("country")}>
              <Input {...text("country")} />
            </Field>
            <Field label="Work model" htmlFor="workModel" required error={err("workModel")}>
              <Select {...text("workModel")}>
                {WORK_MODELS.map((m) => (
                  <option key={m} value={m}>
                    {workModelLabels[m]}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Job type" htmlFor="employmentType" required error={err("employmentType")}>
              <Select {...text("employmentType")}>
                {EMPLOYMENT_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {employmentTypeLabels[t]}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Category" htmlFor="category" required error={err("category")}>
              <Select {...text("category")}>
                <option value="">Choose a category…</option>
                {categories.map((c) => (
                  <option key={c.slug} value={c.slug}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Experience" htmlFor="experience" required error={err("experience")}>
              <Select {...text("experience")}>
                {EXPERIENCE_LEVELS.map((x) => (
                  <option key={x} value={x}>
                    {experienceLabels[x]}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Salary" htmlFor="salary" error={err("salary")} hint='Optional, e.g. "PKR 150,000 – 220,000 / month"' className="sm:col-span-2">
              <Input {...text("salary")} />
            </Field>
          </div>
        </GlassPanel>

        <GlassPanel className="rise-in" style={{ "--stagger": 2 } as React.CSSProperties}>
          <PanelHeader title="Details" />
          <div className="flex flex-col gap-5">
            <Field label="Summary" htmlFor="summary" required error={err("summary")} counter={{ value: v.summary.length, max: 240, min: 30 }}>
              <Textarea {...text("summary")} rows={3} placeholder="One or two sentences about the role." />
            </Field>
            {(["responsibilities", "requirements", "benefits"] as const).map((key) => (
              <fieldset key={key} className="flex flex-col gap-2">
                <legend className="mb-1 text-[13px] font-medium capitalize text-muted">{key}</legend>
                <ListInput
                  name={key}
                  label={key === "responsibilities" ? "Responsibility" : key === "requirements" ? "Requirement" : "Benefit"}
                  defaultValue={v[key]}
                  onChange={(items) => set(key, items)}
                  invalid={Boolean(err(key))}
                />
                {err(key) && <p className="text-xs font-medium text-danger">Each item needs at least 3 characters (max 20 items).</p>}
              </fieldset>
            ))}
          </div>
        </GlassPanel>

        <GlassPanel className="rise-in" style={{ "--stagger": 3 } as React.CSSProperties}>
          <PanelHeader title="How to apply" description="People apply on the company's site or by email." />
          <div role="radiogroup" aria-label="How to apply" className="glass-inset mb-4 inline-flex p-1">
            {(["url", "email"] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                role="radio"
                aria-checked={applyBy === mode}
                onClick={() => setApplyBy(mode)}
                className={cn("rounded-lg px-3 py-1.5 text-sm font-semibold", applyBy === mode ? "bg-primary text-primary-ink" : "text-muted")}
              >
                {mode === "url" ? "Apply link" : "Apply email"}
              </button>
            ))}
          </div>
          {applyBy === "url" ? (
            <Field label="Apply link" htmlFor="applyUrl" error={err("applyUrl")}>
              <Input {...text("applyUrl")} type="url" inputMode="url" placeholder="https://company.com/careers/…" />
            </Field>
          ) : (
            <Field label="Apply email" htmlFor="applyEmail" error={err("applyEmail") ?? err("applyUrl")}>
              <Input {...text("applyEmail")} type="email" inputMode="email" placeholder="jobs@company.com" />
            </Field>
          )}
          {/* Only the chosen method is sent. */}
          <input type="hidden" name={applyBy === "url" ? "applyEmail" : "applyUrl"} value="" />
        </GlassPanel>

        <GlassPanel className="rise-in" style={{ "--stagger": 4 } as React.CSSProperties}>
          <PanelHeader title="Publishing" />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Posted date" htmlFor="postedAt" required error={err("postedAt")} hint="A future date schedules the job">
              <Input {...text("postedAt")} type="date" />
            </Field>
            <Field label="Deadline" htmlFor="deadline" error={err("deadline")} hint="Last day to apply. The job disappears after it.">
              <Input {...text("deadline")} type="date" />
            </Field>
            <fieldset className="sm:col-span-2">
              <legend className="mb-2 text-[13px] font-medium text-muted">Status</legend>
              <div className="flex gap-2">
                {(["draft", "published"] as const).map((s) => (
                  <label key={s} className={cn("glass-inset flex flex-1 cursor-pointer items-center gap-2 px-3 py-2.5 text-sm", v.status === s && "!border-primary")}>
                    <input type="radio" name="status" value={s} checked={v.status === s} onChange={() => set("status", s)} className="accent-[var(--primary)]" />
                    {s === "draft" ? "Draft (hidden)" : needsReview ? "Submit for review" : "Published"}
                  </label>
                ))}
              </div>
              {needsReview && (
                <p className="mt-2 text-xs text-muted">
                  Career Reads checks every new or changed job before it goes live, usually within a working day.
                  {jobState === "live" && " Saving changes takes this job off the site until it's approved again."}
                </p>
              )}
            </fieldset>
            {!isCompany && (
              <Switch
                className="sm:col-span-2"
                name="featured"
                label="Featured"
                description="Pinned to the top of /jobs and shown on the dashboard"
                checked={v.featured}
                onCheckedChange={(c) => set("featured", c)}
              />
            )}
          </div>
        </GlassPanel>
      </div>

      <aside className="flex min-w-0 flex-col gap-4 xl:sticky xl:top-5 xl:self-start">
        <GlassPanel>
          <PanelHeader title="Live preview" description="Exactly as it appears on /jobs" actions={<Eye className="h-4 w-4 text-muted" aria-hidden />} />
          <JobPreviewCard job={{ ...v, city: v.city || undefined, salary: v.salary || undefined }} />
        </GlassPanel>
        <Button type="submit" variant="primary" size="lg" disabled={pending} className="w-full">
          <Save />{" "}
          {pending
            ? "Saving…"
            : v.status === "published" && needsReview
              ? originalSlug
                ? "Save and submit for review"
                : "Submit for review"
              : originalSlug
                ? "Save changes"
                : v.status === "published"
                  ? "Publish job"
                  : "Save draft"}
        </Button>
      </aside>
    </form>
  );
}
