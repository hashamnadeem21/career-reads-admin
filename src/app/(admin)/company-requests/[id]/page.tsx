import {
  AlertTriangle,
  ArrowLeft,
  Building2,
  Globe,
  Mail,
  MapPin,
  Phone,
  UsersRound,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { buttonClasses } from "@/components/admin/Button";
import { GlassPanel, PageHeader, PanelHeader } from "@/components/admin/Glass";
import { LocalTime } from "@/components/admin/LocalTime";
import { RequestStatusBadge } from "@/components/company-requests/CompanyRequestsTable";
import { ReviewRequest } from "@/components/company-requests/ReviewRequest";
import { requireSuperAdmin } from "@/lib/auth/require-user";
import { getCurrentUser } from "@/lib/auth/session";
import { getCompanyRequest } from "@/lib/company-requests/queries";
import { sizeLabel } from "@/lib/company-requests/types";

export async function generateMetadata({
  params,
}: PageProps<"/company-requests/[id]">): Promise<Metadata> {
  const user = await getCurrentUser();
  const detail =
    user?.role === "super_admin"
      ? await getCompanyRequest((await params).id)
      : null;
  return {
    title: detail
      ? `${detail.request.companyName}: company request`
      : "Request not found",
  };
}

function Detail({
  icon: Icon,
  label,
  children,
}: {
  icon: LucideIcon;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex gap-3">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted" aria-hidden />
      <div className="min-w-0">
        <dt className="text-xs font-medium text-muted">{label}</dt>
        <dd className="mt-0.5 break-words">{children}</dd>
      </div>
    </div>
  );
}

/** One company request: what they told us, checks for the reviewer, and approve / turn down. */
export default async function CompanyRequestPage({
  params,
}: PageProps<"/company-requests/[id]">) {
  await requireSuperAdmin();
  const detail = await getCompanyRequest((await params).id);
  if (!detail) notFound();
  const { request: r, checks } = detail;
  const warnings = [
    checks.emailHasAccount &&
      `${r.contactEmail} already has an admin account. Invite a different email, or add them to the company from the Companies page.`,
    checks.companyNameTaken &&
      `A company called “${r.companyName}” already exists. Check it isn't the same company, or use a different name.`,
    checks.previousRequests > 0 &&
      `This email has sent ${checks.previousRequests} earlier ${checks.previousRequests === 1 ? "request" : "requests"}.`,
  ].filter((w): w is string => Boolean(w));

  return (
    <>
      <Link
        href="/company-requests"
        className="mb-3 inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden /> Company requests
      </Link>
      <PageHeader
        title={
          <span className="flex flex-wrap items-center gap-3">
            {r.companyName}
            <RequestStatusBadge status={r.status} />
          </span>
        }
        description={
          <>
            Sent <LocalTime date={r.createdAt} /> by {r.contactName},{" "}
            {r.contactRole}
          </>
        }
        actions={
          <a href={`mailto:${r.contactEmail}`} className={buttonClasses()}>
            <Mail /> Email {r.contactName.split(/\s+/)[0]}
          </a>
        }
      />

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <div className="flex flex-col gap-5">
          <GlassPanel className="rise-in" aria-labelledby="company-title">
            <PanelHeader id="company-title" title="Company" />
            <dl className="grid gap-4 sm:grid-cols-2">
              <Detail icon={Building2} label="Industry">
                {r.industry}
              </Detail>
              <Detail icon={UsersRound} label="Size">
                {sizeLabel(r.companySize)}
              </Detail>
              <Detail icon={MapPin} label="Location">
                {r.location}
              </Detail>
              <Detail icon={Globe} label="Website">
                {r.website ? (
                  <a
                    href={r.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-link hover:underline"
                  >
                    {r.website.replace(/^https?:\/\//, "")}
                  </a>
                ) : (
                  <span className="text-muted">Not given</span>
                )}
              </Detail>
            </dl>
          </GlassPanel>

          <GlassPanel className="rise-in" aria-labelledby="contact-title">
            <PanelHeader id="contact-title" title="Contact" />
            <dl className="grid gap-4 sm:grid-cols-2">
              <Detail icon={UsersRound} label="Name and job title">
                {r.contactName}, {r.contactRole}
              </Detail>
              <Detail icon={Mail} label="Email">
                <a
                  href={`mailto:${r.contactEmail}`}
                  className="text-link hover:underline"
                >
                  {r.contactEmail}
                </a>
              </Detail>
              <Detail icon={Phone} label="Phone">
                <a
                  href={`tel:${r.contactPhone.replace(/[^\d+]/g, "")}`}
                  className="text-link hover:underline"
                >
                  {r.contactPhone}
                </a>
              </Detail>
            </dl>
            <h3 className="mt-5 text-xs font-medium text-muted">
              What they&apos;re hiring for
            </h3>
            <p className="mt-1 whitespace-pre-line">
              {r.hiringPlans ?? (
                <span className="text-muted">They didn&apos;t say.</span>
              )}
            </p>
          </GlassPanel>
        </div>

        <div className="flex flex-col gap-5">
          {warnings.length > 0 && r.status === "pending" && (
            <div
              role="note"
              className="glass-inset rise-in flex flex-col gap-2 p-4 text-sm"
            >
              {warnings.map((w) => (
                <p key={w} className="flex gap-2">
                  <AlertTriangle
                    className="mt-0.5 h-4 w-4 shrink-0 text-accent"
                    aria-hidden
                  />{" "}
                  {w}
                </p>
              ))}
            </div>
          )}
          <ReviewRequest
            request={r}
            decided={
              <GlassPanel className="rise-in" aria-labelledby="decision-title">
                <PanelHeader
                  id="decision-title"
                  title={r.status === "approved" ? "Approved" : "Turned down"}
                  description={
                    <>
                      {r.reviewedByName ?? "Someone"} decided{" "}
                      {r.reviewedAt && <LocalTime date={r.reviewedAt} />}
                    </>
                  }
                />
                {r.status === "approved" ? (
                  r.companyId ? (
                    <Link
                      href={`/companies/${r.companyId}`}
                      className={buttonClasses({ variant: "primary" })}
                    >
                      <Building2 /> Open{" "}
                      {r.approvedCompanyName ?? "the company"}
                    </Link>
                  ) : (
                    <p className="text-sm text-muted">
                      The company has since been deleted.
                    </p>
                  )
                ) : (
                  <p className="whitespace-pre-line text-sm">
                    {r.reviewNote ?? (
                      <span className="text-muted">No reason was given.</span>
                    )}
                  </p>
                )}
              </GlassPanel>
            }
          />
        </div>
      </div>
    </>
  );
}
