"use client";

import { Bell, FileText, Inbox, Plus, Trash2 } from "lucide-react";
import type { ReactNode } from "react";
import { toast } from "sonner";
import { Avatar } from "@/components/admin/Avatar";
import { Badge, StatusPill } from "@/components/admin/Badge";
import { Button } from "@/components/admin/Button";
import { EmptyState } from "@/components/admin/EmptyState";
import { Checkbox, Field, Input, Select, Switch, Textarea } from "@/components/admin/Field";
import { ConfirmDialog, GlassDialog, GlassDrawer } from "@/components/admin/GlassDialog";
import { GlassInset, GlassPanel, PanelHeader } from "@/components/admin/Glass";
import { TagInput } from "@/components/admin/TagInput";
import { Tooltip } from "@/components/admin/Tooltip";
import { cn } from "@/lib/utils";

function Swatch({ name, token }: { name: string; token: string }) {
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="h-6 w-6 rounded-lg border border-divider" style={{ background: `var(${token})` }} />
      <span className="text-muted">{name}</span>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <GlassPanel>
      <PanelHeader title={title} />
      {children}
    </GlassPanel>
  );
}

/** Every component in one theme. Rendered twice side by side (light + dark). */
function Specimen({ theme, extra }: { theme: "light" | "dark"; extra?: ReactNode }) {
  const id = (name: string) => `${theme}-${name}`;
  return (
    <div className={cn("admin-root relative isolate overflow-hidden rounded-[var(--radius-shell)] p-4 sm:p-6", theme === "dark" && "dark")}>
      <div className="admin-backdrop !absolute !-z-10" aria-hidden>
        <div className="admin-blob" />
        <div className="admin-blob" />
        <div className="admin-blob" />
        <div className="admin-blob" />
      </div>
      <p className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted">{theme === "light" ? "Aurora · light" : "Ember · dark"}</p>
      <div className="flex flex-col gap-5">
        <Section title="Tokens">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            <Swatch name="ink" token="--ink" />
            <Swatch name="muted" token="--ink-muted" />
            <Swatch name="primary" token="--primary" />
            <Swatch name="accent" token="--accent" />
            <Swatch name="success" token="--success" />
            <Swatch name="danger" token="--danger" />
            {[1, 2, 3, 4, 5].map((n) => (
              <Swatch key={n} name={`chart-${n}`} token={`--chart-${n}`} />
            ))}
          </div>
        </Section>

        <Section title="Typography">
          <p className="text-[28px] font-bold leading-tight tracking-tight">Page title 28/700</p>
          <p className="text-base font-semibold">Panel title 16/600</p>
          <p className="num text-[40px] font-bold leading-none tracking-tighter">2,410</p>
          <p className="text-[13px] font-medium text-muted">Label 13/500 muted</p>
          <p className="text-sm">Table text 14 — The quick brown fox jumps over the lazy dog.</p>
        </Section>

        <Section title="Buttons">
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="primary">
              <Plus /> Primary
            </Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="danger">
              <Trash2 /> Danger
            </Button>
            <Button variant="primary" disabled>
              Disabled
            </Button>
            <Tooltip content="Notifications" side="top">
              <Button variant="secondary" size="icon" aria-label="Notifications">
                <Bell />
              </Button>
            </Tooltip>
            <Button variant="primary" size="sm">
              Small
            </Button>
          </div>
        </Section>

        <Section title="Badges and status">
          <div className="flex flex-wrap gap-2">
            <StatusPill state="live" />
            <StatusPill state="draft" />
            <StatusPill state="scheduled" />
            <StatusPill state="expired" />
            <Badge tone="info">Admin</Badge>
            <Badge tone="warning">Editor</Badge>
            <Badge>Neutral</Badge>
          </div>
          <div className="mt-4 flex items-center gap-2">
            <Avatar name="Hasham Ahmed" />
            <Avatar name="Editorial Team" />
            <Avatar name="Sara" size={28} />
          </div>
        </Section>

        <Section title="Form controls">
          <div className="grid gap-4">
            <Field label="Title" htmlFor={id("title")} hint="Shown on the site and in search results." counter={{ value: 24, max: 110 }}>
              <Input id={id("title")} defaultValue="Frontend Developer role" />
            </Field>
            <Field label="Email" htmlFor={id("email")} error="Enter a valid email">
              <Input id={id("email")} defaultValue="not-an-email" invalid />
            </Field>
            <Field label="Category" htmlFor={id("category")}>
              <Select id={id("category")} defaultValue="software-it">
                <option value="software-it">Software & IT</option>
                <option value="design-creative">Design & Creative</option>
              </Select>
            </Field>
            <Field label="Summary" htmlFor={id("summary")}>
              <Textarea id={id("summary")} defaultValue="Build fast, accessible interfaces." />
            </Field>
            <Field label="Tags" htmlFor={id("tags")}>
              <TagInput id={id("tags")} name="tags" defaultValue={["react", "nextjs"]} />
            </Field>
            <Field label="Deadline" htmlFor={id("deadline")}>
              <Input id={id("deadline")} type="date" defaultValue="2026-12-31" />
            </Field>
            <Switch label="Featured" description="Pinned to the top of /jobs" defaultChecked />
            <Checkbox label="Remote friendly" defaultChecked />
          </div>
        </Section>

        <Section title="Insets and skeleton">
          <GlassInset className="grid grid-cols-3 divide-x divide-divider p-3 text-center">
            {[
              ["Views", "1,284"],
              ["Apply clicks", "96"],
              ["Days left", "6"],
            ].map(([label, value]) => (
              <div key={label}>
                <p className="text-xs text-muted">{label}</p>
                <p className="num text-lg font-bold">{value}</p>
              </div>
            ))}
          </GlassInset>
          <div className="mt-4 flex flex-col gap-2" aria-hidden>
            <div className="skeleton h-4 w-2/3" />
            <div className="skeleton h-4 w-1/2" />
            <div className="skeleton h-24 w-full" />
          </div>
        </Section>

        <Section title="Overlays">
          <div className="flex flex-wrap gap-2">
            <GlassDialog title="Glass dialog" description="Background dims and blurs." trigger={<Button>Open dialog</Button>}>
              <p className="text-sm text-muted">Dialogs are 92% opaque so text stays readable.</p>
            </GlassDialog>
            <GlassDrawer title="Glass drawer" description="Slides in from the side." trigger={<Button>Open drawer</Button>}>
              <p className="text-sm text-muted">Media picker, details, mobile navigation.</p>
            </GlassDrawer>
            <ConfirmDialog
              trigger={<Button variant="danger">Delete…</Button>}
              title="Delete this job?"
              description="This can't be undone. Unpublish instead to keep it as a draft."
              onConfirm={() => void toast.success("Deleted (not really)")}
            />
            <Button onClick={() => toast.success("Job published", { action: { label: "View", onClick: () => {} } })}>Show toast</Button>
          </div>
        </Section>

        <Section title="Empty states">
          <div className="grid gap-3 sm:grid-cols-2">
            <GlassInset>
              <EmptyState compact icon={FileText} title="No posts yet" description="Write your first post." action={<Button variant="primary" size="sm">New post</Button>} />
            </GlassInset>
            <GlassInset>
              <EmptyState compact icon={Inbox} title="You're all caught up" />
            </GlassInset>
          </div>
        </Section>
        {extra}
      </div>
    </div>
  );
}

export function StyleGuide({ extra }: { extra?: (theme: "light" | "dark") => ReactNode }) {
  return (
    <div className="grid gap-6 2xl:grid-cols-2">
      <Specimen theme="light" extra={extra?.("light")} />
      <Specimen theme="dark" extra={extra?.("dark")} />
    </div>
  );
}
