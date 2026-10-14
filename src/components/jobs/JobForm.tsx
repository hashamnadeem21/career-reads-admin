"use client";

import { Eye, Save } from "lucide-react";
import { useActionState, useState } from "react";
import { saveJob } from "@/app/actions/jobs";
import { Button } from "@/components/admin/Button";
import { Field, Input, Select, Switch, Textarea } from "@/components/admin/Field";
import { GlassPanel, PanelHeader } from "@/components/admin/Glass";
import { BulletListInput } from "@/components/admin/BulletListInput";
import { RichTextEditor } from "@/components/admin/RichTextEditor";
import { initialFormState } from "@/lib/form-state";
import { jobSlugFrom } from "@/lib/jobs/form";
import { questionsField, type JobFormValues } from "@/lib/jobs/form-values";
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
import { QuestionBuilder } from "./QuestionBuilder";

export interface CompanyOption {
  id: string;
  name: string;
  website: string | null;
  onsiteApplyEnabled: boolean;
}

/**
 * Basics · Location & type · Details · How to apply · Publishing, with a live preview card.
 *
 * Staff pass `companies` (to pick which company account owns the job).
 * Company accounts pass `company`: the name is fixed, and unless the company is trusted,
 * publishing becomes "Submit for review". "Featured" is shown only with `canFeature`
 * (super admins): featured slots are an ad placement. "Apply on Career Reads" is offered for
 * Career Reads' own jobs and companies a super admin has allowed (`onsiteApplyEnabled`).
 */
const escapeHtml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** An older job's summary and lists as one description, for "Switch to the editor". */
function legacyToHtml(job: Pick<JobFormValues, "summary" | "responsibilities" | "requirements" | "benefits">): string {
  const section = (title: string, items: string[]) => {
    const points = items.map((i) => i.trim()).filter(Boolean);
    return points.length ? `<h3>${title}</h3><ul>${points.map((p) => `<li><p>${escapeHtml(p)}</p></li>`).join("")}</ul>` : "";
  };
  return [
    job.summary.trim() ? `<p>${escapeHtml(job.summary.trim())}</p>` : "",
    section("Responsibilities", job.responsibilities),
    section("Requirements", job.requirements),
    section("Benefits", job.benefits),
  ].join("");
}

const placeholders = {
  responsibilities: "Build and maintain REST APIs",
  requirements: "3+ years with Node.js",
  benefits: "Health insurance for you and your family",
};

export function JobForm({
  initial,
  originalSlug,
  categories,
  companies,
  company,
  canFeature = false,
  state: jobState,
}: {
  initial: JobFormValues;
  originalSlug?: string;
  categories: { slug: string; name: string }[];
  companies?: CompanyOption[];
  company?: { name: string; autoPublish: boolean; onsiteApply: boolean };
  canFeature?: boolean;
  /** Current state of an existing job (for the "goes back to review" warning). */
  state?: ContentState;
}) {
  const isCompany = Boolean(company);
  const needsReview = isCompany && !company?.autoPublish;
  const [state, action, pending] = useActionState(saveJob, initialFormState);
  const [v, setV] = useState(initial);
  const [slugEdited, setSlugEdited] = useState(Boolean(originalSlug));
  // New jobs and jobs saved with the editor use it; older jobs keep their fields until you switch.
  const [richText, setRichText] = useState(Boolean(initial.description) || !originalSlug);
  const [applyBy, setApplyBy] = useState<"url" | "email" | "none">(
    initial.applyUrl ? "url" : initial.applyEmail ? "email" : initial.onsiteApply ? "none" : "url",
  );
  const err = (key: string) => state.errors?.[key];
  // Already on stays allowed (a later permission change doesn't block unrelated edits; the API agrees).
  const keepsOnsite = initial.onsiteApply && (company ? true : initial.companyId === v.companyId);
  const onsiteAllowed =
    keepsOnsite ||
    (company ? company.onsiteApply : !v.companyId || Boolean(companies?.find((c) => c.id === v.companyId)?.onsiteApplyEnabled));
  const onsite = onsiteAllowed && v.onsiteApply;
  // With on-site applications, "Career Reads only" is a choice; without them a link or email is needed.
  const external = !onsite && applyBy === "none" ? "url" : applyBy;

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
          <PanelHeader
            title={richText ? "Job description" : "Details"}
            description={
              richText
                ? "Paste the whole job ad here. Bold, italics, headings, bullet points and links are kept and shown on the site exactly like this."
                : undefined
            }
          />
          {richText ? (
            <Field label="Job description" htmlFor="description" required error={err("description") ?? err("summary")}>
              <RichTextEditor
                id="description"
                name="description"
                defaultValue={v.description}
                invalid={Boolean(err("description") ?? err("summary"))}
                placeholder="Paste or write the job description: about the role, responsibilities, requirements, benefits…"
                onChange={(html) => set("description", html)}
              />
            </Field>
          ) : (
            <div className="flex flex-col gap-5">
              <div className="glass-inset flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm">
                <p className="text-muted">This job uses the older layout. Switch to edit it as one formatted description.</p>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    set("description", legacyToHtml(v));
                    setRichText(true);
                  }}
                >
                  Switch to the editor
                </Button>
              </div>
              <Field label="Summary" htmlFor="summary" required error={err("summary")} hint="A short intro to the role, at least 30 characters.">
                <Textarea {...text("summary")} rows={5} placeholder="What the role is about and who it's for." />
              </Field>
              {(["responsibilities", "requirements", "benefits"] as const).map((key) => (
                <fieldset key={key} className="flex flex-col gap-2">
                  <legend className="mb-1 text-[13px] font-medium capitalize text-muted">{key}</legend>
                  <BulletListInput
                    name={key}
                    label={key === "responsibilities" ? "Responsibility" : key === "requirements" ? "Requirement" : "Benefit"}
                    defaultValue={v[key]}
                    onChange={(items) => set(key, items)}
                    invalid={Boolean(err(key))}
                    placeholder={placeholders[key]}
                  />
                  {err(key) && <p className="text-xs font-medium text-danger">Each point needs at least 3 characters (max 20 points).</p>}
                </fieldset>
              ))}
            </div>
          )}
        </GlassPanel>

        <GlassPanel className="rise-in" style={{ "--stagger": 3 } as React.CSSProperties}>
          <PanelHeader
            title="How candidates apply"
            description="On Career Reads, on the company's own site or by email, or both, like LinkedIn's Easy Apply next to “Apply on company website”."
          />
          {/* Sent even while on-site applications are off, so switching them off doesn't lose the questions. */}
          <input type="hidden" name="questions" value={questionsField(v.questions)} />
          {onsiteAllowed ? (
            <div className="flex flex-col gap-4">
              <Switch
                name="onsiteApply"
                label="Apply on Career Reads"
                description="Candidates upload their CV and answer your questions without leaving the site. You'll find them under Applicants."
                checked={v.onsiteApply}
                onCheckedChange={(c) => set("onsiteApply", c)}
              />
              {err("onsiteApply") && <p className="text-xs font-medium text-danger">{err("onsiteApply")}</p>}
              {onsite && (
                <fieldset className="flex flex-col gap-2">
                  <legend className="mb-2 text-sm font-semibold">Screening questions</legend>
                  <QuestionBuilder value={v.questions} onChange={(questions) => set("questions", questions)} error={err} />
                </fieldset>
              )}
            </div>
          ) : (
            <p className="glass-inset px-4 py-3 text-sm text-muted">
              {company
                ? "Want CVs sent straight to your account? Ask Career Reads to turn on applications on Career Reads for your company."
                : "Applications on Career Reads aren't turned on for this company. A super admin can turn them on under Companies."}
            </p>
          )}

          <div className="mt-5 border-t border-glass-border pt-5">
            <p className="mb-3 text-sm font-semibold">{onsite ? "Also apply on the company's site (optional)" : "Apply on the company's site"}</p>
            <div role="radiogroup" aria-label="Apply on the company's site" className="glass-inset mb-4 inline-flex p-1">
              {(onsite ? (["none", "url", "email"] as const) : (["url", "email"] as const)).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  role="radio"
                  aria-checked={external === mode}
                  onClick={() => setApplyBy(mode)}
                  className={cn("rounded-lg px-3 py-1.5 text-sm font-semibold", external === mode ? "bg-primary text-primary-ink" : "text-muted")}
                >
                  {mode === "url" ? "Apply link" : mode === "email" ? "Apply email" : "Career Reads only"}
                </button>
              ))}
            </div>
            {external === "url" ? (
              <Field label="Apply link" htmlFor="applyUrl" error={err("applyUrl")}>
                <Input {...text("applyUrl")} type="url" inputMode="url" placeholder="https://company.com/careers/…" />
              </Field>
            ) : external === "email" ? (
              <Field label="Apply email" htmlFor="applyEmail" error={err("applyEmail") ?? err("applyUrl")}>
                <Input {...text("applyEmail")} type="email" inputMode="email" placeholder="jobs@company.com" />
              </Field>
            ) : (
              <p className="text-sm text-muted">Candidates apply on Career Reads only.</p>
            )}
            {/* Only the chosen method is sent. */}
            {external !== "url" && <input type="hidden" name="applyUrl" value="" />}
            {external !== "email" && <input type="hidden" name="applyEmail" value="" />}
          </div>
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
            {canFeature && (
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
