import type { Metadata } from "next";
import { GlassInset, GlassPanel, PageHeader, PanelHeader } from "@/components/admin/Glass";
import { requireUser } from "@/lib/auth/require-user";

export const metadata: Metadata = { title: "Help" };

const shortcuts = [
  ["⌘ K / Ctrl K", "Open the command palette: jump to any page, search posts and jobs, create new items"],
  ["Esc", "Close dialogs, drawers and the palette"],
  ["Tab / Shift Tab", "Move between controls"],
  ["↑ ↓ in tables", "Move between rows; Enter opens the row"],
];

const faqs = [
  ["When do changes appear on the site?", "Within seconds. Every save tells the public site to refresh the affected pages."],
  ["What's the difference between Admin and Editor?", "Editors write and publish posts and jobs, manage media and read messages. Only Admins can change settings and users."],
  ["Unpublish or delete?", "Unpublish keeps the post or job as a draft so you can bring it back. Delete removes it for good."],
  ["Where do the dashboard numbers come from?", "Counts come straight from the database. Traffic comes from a privacy-friendly counter on the public site: no cookies, no IP addresses, just page counts per day."],
];

export default async function HelpPage() {
  await requireUser();
  return (
    <>
      <PageHeader title="Help" description="Shortcuts and answers to common questions." />
      <div className="grid gap-5 lg:grid-cols-2">
        <GlassPanel className="rise-in">
          <PanelHeader title="Keyboard shortcuts" />
          <ul className="flex flex-col gap-2">
            {shortcuts.map(([keys, text]) => (
              <li key={keys}>
                <GlassInset className="flex items-start gap-4 p-3 text-sm">
                  <kbd className="shrink-0 rounded-md border border-divider px-2 py-0.5 text-xs font-semibold">{keys}</kbd>
                  <span className="text-muted">{text}</span>
                </GlassInset>
              </li>
            ))}
          </ul>
        </GlassPanel>
        <GlassPanel className="rise-in" style={{ "--stagger": 1 } as React.CSSProperties}>
          <PanelHeader title="Questions" />
          <dl className="flex flex-col gap-4">
            {faqs.map(([q, a]) => (
              <div key={q}>
                <dt className="text-sm font-semibold">{q}</dt>
                <dd className="mt-1 text-sm text-muted">{a}</dd>
              </div>
            ))}
          </dl>
        </GlassPanel>
      </div>
    </>
  );
}
