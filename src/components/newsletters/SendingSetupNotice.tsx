import { TriangleAlert } from "lucide-react";

/** Shown until the API can send email, so nobody wonders why "Send" is greyed out. */
export function SendingSetupNotice() {
  return (
    <div role="status" className="mb-5 flex items-start gap-3 rounded-2xl bg-accent-soft px-4 py-3 text-sm text-accent">
      <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      <div className="text-ink">
        <p className="font-semibold text-accent">Email sending isn&apos;t set up yet</p>
        <p className="mt-1">
          You can write and preview emails now. To send them, verify your domain in Resend and set{" "}
          <code className="text-xs">RESEND_API_KEY</code>, <code className="text-xs">NEWSLETTER_FROM</code> and{" "}
          <code className="text-xs">API_PUBLIC_URL</code> on the API.
        </p>
      </div>
    </div>
  );
}
