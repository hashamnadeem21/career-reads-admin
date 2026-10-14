import { BadgeCheck, CalendarPlus, FileUser, LogIn, LogOut, Mail, MailCheck, MailWarning, Newspaper, Send } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Avatar } from "@/components/admin/Avatar";
import { Badge } from "@/components/admin/Badge";
import { buttonClasses } from "@/components/admin/Button";
import { GlassPanel, PageHeader, PanelHeader } from "@/components/admin/Glass";
import { LocalTime } from "@/components/admin/LocalTime";
import { StatStrip } from "@/components/admin/StatStrip";
import { StatusBadge } from "@/components/applications/ApplicationsTable";
import { MethodBadge } from "@/components/candidates/CandidatesTable";
import { DeleteCandidateButton } from "@/components/candidates/DeleteCandidateButton";
import { requireSuperAdmin } from "@/lib/auth/require-user";
import { getCurrentUser } from "@/lib/auth/session";
import { getCandidate } from "@/lib/candidates/queries";
import { type CandidateDetail, type CandidateEventKind, METHOD_LABELS } from "@/lib/candidates/types";
import { formatDate, formatNumber } from "@/lib/utils";

export async function generateMetadata({ params }: PageProps<"/candidates/[id]">): Promise<Metadata> {
  const user = await getCurrentUser();
  const detail = user?.role === "super_admin" ? await getCandidate((await params).id) : null;
  return { title: detail ? `${detail.candidate.name}: candidate` : "Candidate not found" };
}

const EVENTS: Record<CandidateEventKind, { icon: LucideIcon; label: string }> = {
  signed_up: { icon: CalendarPlus, label: "Created an account" },
  signed_in: { icon: LogIn, label: "Signed in" },
  signed_out: { icon: LogOut, label: "Signed out" },
  email_confirmed: { icon: MailCheck, label: "Confirmed their email" },
  password_reset: { icon: BadgeCheck, label: "Chose a new password" },
  applied: { icon: Send, label: "Applied" },
  subscribed: { icon: Newspaper, label: "Subscribed to the newsletter" },
};

function eventText(event: CandidateDetail["history"][number]) {
  const base = EVENTS[event.kind].label;
  if (event.kind === "applied" && event.job) return `${base} for ${event.job.title}`;
  if ((event.kind === "signed_up" || event.kind === "signed_in") && event.method && event.method !== "apply") {
    return `${base} with ${event.method === "google" ? "Google" : "email and password"}`;
  }
  return base;
}

/** One candidate: their account, what they did and when, and their applications. Super admins only. */
export default async function CandidatePage({ params }: PageProps<"/candidates/[id]">) {
  await requireSuperAdmin();
  const detail = await getCandidate((await params).id);
  if (!detail) notFound();
  const { candidate: c, history, applications } = detail;

  return (
    <>
      <PageHeader
        title={
          <span className="flex flex-wrap items-center gap-3">
            <Avatar name={c.name} src={c.avatarUrl} size={40} />
            {c.name}
            <MethodBadge method={c.signupMethod} />
          </span>
        }
        description={
          <>
            {c.email} · signed up {formatDate(c.accountCreatedAt)}
          </>
        }
        actions={
          <>
            <a href={`mailto:${c.email}`} className={buttonClasses({ variant: "primary" })}>
              <Mail /> Email {c.name.split(/\s+/)[0]}
            </a>
            <DeleteCandidateButton id={c.id} name={c.name} />
          </>
        }
      />
      <StatStrip
        items={[
          { icon: c.emailVerified ? MailCheck : MailWarning, label: "Email", value: c.emailVerified ? "Confirmed" : "Not confirmed" },
          { icon: LogIn, label: "Sign-ins", value: formatNumber(c.signInCount) },
          { icon: FileUser, label: "Applications", value: formatNumber(c.applications) },
          { icon: Newspaper, label: "Newsletter", value: c.subscribed ? "Subscribed" : "Not subscribed" },
        ]}
      />

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <GlassPanel className="rise-in">
          <PanelHeader title="Applications" description="Every job they applied for on Career Reads." />
          {applications.length === 0 ? (
            <p className="text-sm text-muted">No applications yet.</p>
          ) : (
            <ul className="divide-y divide-divider">
              {applications.map((a) => (
                <li key={a.id} className="flex flex-wrap items-center gap-3 py-3">
                  <span className="min-w-0 flex-1">
                    {a.awaitingConfirmation ? (
                      <span className="line-clamp-1 font-medium">{a.job.title}</span>
                    ) : (
                      <Link href={`/applications/${a.id}`} className="line-clamp-1 font-medium hover:text-link">
                        {a.job.title}
                      </Link>
                    )}
                    <span className="block text-xs text-muted">
                      {a.job.company} · {formatDate(a.createdAt)}
                    </span>
                  </span>
                  {a.awaitingConfirmation ? <Badge tone="warning">Waiting for email confirmation</Badge> : <StatusBadge status={a.status} />}
                </li>
              ))}
            </ul>
          )}
        </GlassPanel>

        <GlassPanel className="rise-in">
          <PanelHeader title="History" description={`Signed up with ${METHOD_LABELS[c.signupMethod].toLowerCase()}. Newest first.`} />
          {history.length === 0 ? (
            <p className="text-sm text-muted">Nothing yet.</p>
          ) : (
            <ol className="flex flex-col gap-3">
              {history.map((event) => {
                const Icon = EVENTS[event.kind].icon;
                return (
                  <li key={event.id} className="flex items-start gap-3 text-sm">
                    <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary-soft text-link" aria-hidden>
                      <Icon className="h-3.5 w-3.5" />
                    </span>
                    <span className="min-w-0">
                      <span className="block">{eventText(event)}</span>
                      <LocalTime date={event.createdAt} className="text-xs text-muted" />
                    </span>
                  </li>
                );
              })}
            </ol>
          )}
        </GlassPanel>
      </div>
    </>
  );
}
