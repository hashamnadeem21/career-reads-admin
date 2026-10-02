"use client";

import { Megaphone, Save } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { saveSettings } from "@/app/actions/settings";
import { Button } from "@/components/admin/Button";
import { Field, Input, Switch } from "@/components/admin/Field";
import { GlassPanel, PanelHeader } from "@/components/admin/Glass";
import type { AdsSettings, SiteSettings } from "@/shared/settings-schema";
import { AD_PLACEMENTS } from "@/shared/settings-schema";
import { cn } from "@/lib/utils";

const placementLabels: Record<Placement, string> = {
  "in-article": "In-article (between sections)",
  sidebar: "Sidebar",
  "below-article": "Below the article",
  listing: "Listing pages",
};

type Placement = (typeof AD_PLACEMENTS)[number];

function isVisible(ads: AdsSettings, p: Placement) {
  return ads.showPlaceholders || (ads.enabled && Boolean(ads.clientId) && Boolean(ads.slots[p]));
}

function AdBox({ ads, p, className }: { ads: AdsSettings; p: Placement; className?: string }) {
  if (!isVisible(ads, p)) return null;
  return (
    <div className={cn("flex items-center justify-center rounded-lg border-2 border-dashed border-[#93c5fd] bg-[#eff6ff] text-[10px] font-semibold uppercase tracking-wider text-[#1d4ed8]", className)}>
      {p}
    </div>
  );
}

/** A miniature article showing where ads will appear with the current settings. */
function AdsPreview({ ads }: { ads: AdsSettings }) {
  return (
    <div className="rounded-xl bg-white p-4 text-[#0f172a] shadow-inner" aria-label="Ads preview">
      <div className="grid grid-cols-[1fr_72px] gap-3">
        <div className="flex flex-col gap-2">
          <div className="h-3 w-3/4 rounded bg-[#cbd5e1]" />
          <div className="h-2 rounded bg-[#e2e8f0]" />
          <div className="h-2 w-5/6 rounded bg-[#e2e8f0]" />
          <AdBox ads={ads} p="in-article" className="h-10" />
          <div className="h-2 rounded bg-[#e2e8f0]" />
          <div className="h-2 w-2/3 rounded bg-[#e2e8f0]" />
          <AdBox ads={ads} p="below-article" className="h-8" />
        </div>
        <AdBox ads={ads} p="sidebar" className="h-full min-h-24" />
      </div>
      {!AD_PLACEMENTS.some((p) => isVisible(ads, p)) && <p className="mt-3 text-center text-xs text-[#475569]">No ads will show with these settings.</p>}
    </div>
  );
}

export function SettingsForm({ initial }: { initial: { ads: AdsSettings; site: SiteSettings } }) {
  const [ads, setAds] = useState(initial.ads);
  const [site, setSite] = useState(initial.site);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, start] = useTransition();

  return (
    <form
      className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const r = await saveSettings({ ads, site });
          setErrors(r.errors ?? {});
          (r.ok ? toast.success : toast.error)(r.message);
        });
      }}
    >
      <div className="flex min-w-0 flex-col gap-5">
        <GlassPanel className="rise-in">
          <PanelHeader title="Ads" description="Google AdSense. Ads only load on the live site (production) once switched on." />
          <div className="flex flex-col gap-4">
            <Switch label="Show ads" description="Requests real ads from Google on every page with an ad slot" checked={ads.enabled} onCheckedChange={(v) => setAds({ ...ads, enabled: v })} />
            <Switch
              label="Show ad placeholders"
              description="Dashed boxes where ads will go. Visitors see them too, so use while setting up."
              checked={ads.showPlaceholders}
              onCheckedChange={(v) => setAds({ ...ads, showPlaceholders: v })}
            />
            <Field label="AdSense client ID" htmlFor="clientId" error={errors["ads.clientId"]} hint="Looks like ca-pub-0000000000000000. Leave empty to use the site's environment variable.">
              <Input id="clientId" value={ads.clientId} placeholder="ca-pub-…" invalid={Boolean(errors["ads.clientId"])} onChange={(e) => setAds({ ...ads, clientId: e.target.value.trim() })} />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              {AD_PLACEMENTS.map((p) => (
                <Field key={p} label={`Slot: ${placementLabels[p]}`} htmlFor={`slot-${p}`} error={errors[`ads.slots.${p}`]}>
                  <Input
                    id={`slot-${p}`}
                    inputMode="numeric"
                    value={ads.slots[p]}
                    placeholder="1234567890"
                    invalid={Boolean(errors[`ads.slots.${p}`])}
                    onChange={(e) => setAds({ ...ads, slots: { ...ads.slots, [p]: e.target.value.trim() } })}
                  />
                </Field>
              ))}
            </div>
          </div>
        </GlassPanel>

        <GlassPanel className="rise-in" style={{ "--stagger": 1 } as React.CSSProperties}>
          <PanelHeader title="Site info" description="Leave a field empty to keep the value from the site's environment variables." />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Contact email" htmlFor="contactEmail" error={errors["site.contactEmail"]} className="sm:col-span-2" hint="Shown on Contact, About and Privacy pages">
              <Input id="contactEmail" type="email" value={site.contactEmail} invalid={Boolean(errors["site.contactEmail"])} onChange={(e) => setSite({ ...site, contactEmail: e.target.value.trim() })} />
            </Field>
            {(["x", "linkedin", "github"] as const).map((k) => (
              <Field key={k} label={k === "x" ? "X (Twitter)" : k === "linkedin" ? "LinkedIn" : "GitHub"} htmlFor={`social-${k}`} error={errors[`site.social.${k}`]}>
                <Input
                  id={`social-${k}`}
                  type="url"
                  placeholder="https://"
                  value={site.social[k]}
                  invalid={Boolean(errors[`site.social.${k}`])}
                  onChange={(e) => setSite({ ...site, social: { ...site.social, [k]: e.target.value.trim() } })}
                />
              </Field>
            ))}
          </div>
        </GlassPanel>
      </div>

      <aside className="flex flex-col gap-4 xl:sticky xl:top-5 xl:self-start">
        <GlassPanel>
          <PanelHeader title="Ads preview" actions={<Megaphone className="h-4 w-4 text-muted" aria-hidden />} />
          <AdsPreview ads={ads} />
        </GlassPanel>
        <Button type="submit" variant="primary" size="lg" disabled={pending}>
          <Save /> {pending ? "Saving…" : "Save settings"}
        </Button>
      </aside>
    </form>
  );
}
