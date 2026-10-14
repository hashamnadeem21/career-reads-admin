import { Download, ExternalLink, Link2, Mail, MapPin, Phone } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { buttonClasses } from "@/components/admin/Button";
import { GlassPanel, PageHeader, PanelHeader } from "@/components/admin/Glass";
import { ApplicationReview } from "@/components/applications/ApplicationReview";
import { StatusBadge } from "@/components/applications/ApplicationsTable";
import { getApplication } from "@/lib/applications/queries";
import { answerText } from "@/lib/applications/types";
import { requireUser } from "@/lib/auth/require-user";
import { getCurrentUser } from "@/lib/auth/session";
import { formatDate } from "@/lib/utils";

export async function generateMetadata({ params }: PageProps<"/applications/[id]">): Promise<Metadata> {
  const user = await getCurrentUser();
  const detail = user ? await getApplication((await params).id) : null;
  return { title: detail ? `${detail.application.name}: application` : "Application not found" };
}

const kb = (bytes: number) => (bytes >= 1_048_576 ? `${(bytes / 1_048_576).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`);

/** One application. Another company's application is a 404, the same as a missing one. */
export default async function ApplicationPage({ params }: PageProps<"/applications/[id]">) {
  await requireUser();
  const { id } = await params;
  const detail = await getApplication(id);
  if (!detail) notFound();
  const { application: a, job, cv, answers, events } = detail;
  const cvUrl = `/api/applications/${a.id}/cv`;
  const isPdf = cv?.contentType === "application/pdf";

  return (
    <>
      <PageHeader
        title={
          <span className="flex flex-wrap items-center gap-3">
            {a.name} <StatusBadge status={a.status} />
          </span>
        }
        description={
          <>
            Applied for{" "}
            {job ? (
              <Link href={`/applications?job=${encodeURIComponent(job.slug)}`} className="font-medium text-link hover:underline">
                {job.title}
              </Link>
            ) : (
              "a job"
            )}{" "}
            on {formatDate(a.createdAt)}
          </>
        }
        actions={
          <>
            <a href={`mailto:${a.email}?subject=${encodeURIComponent(`Your application: ${job?.title ?? "job"}`)}`} className={buttonClasses({ variant: "primary" })}>
              <Mail /> Email {a.name.split(/\s+/)[0]}
            </a>
            {cv && (
              <a href={`${cvUrl}?download=true`} className={buttonClasses()}>
                <Download /> Download CV
              </a>
            )}
          </>
        }
      />
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="flex min-w-0 flex-col gap-5">
          <GlassPanel className="rise-in">
            <PanelHeader
              title="CV"
              description={cv ? `${cv.name} · ${kb(cv.sizeBytes)}` : undefined}
              actions={
                isPdf ? (
                  <a href={cvUrl} target="_blank" rel="noopener" className={buttonClasses({ size: "sm" })}>
                    <ExternalLink /> Open in a new tab
                  </a>
                ) : undefined
              }
            />
            {!cv ? (
              <p className="text-sm text-muted">This CV is no longer available.</p>
            ) : isPdf ? (
              <iframe src={cvUrl} title={`${a.name}'s CV`} className="h-[75dvh] w-full rounded-xl border border-glass-border bg-white" />
            ) : (
              <div className="glass-inset flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm">
                <p className="text-muted">Word documents can&apos;t be previewed here. Download it to read it.</p>
                <a href={`${cvUrl}?download=true`} className={buttonClasses({ size: "sm", variant: "primary" })}>
                  <Download /> Download CV
                </a>
              </div>
            )}
          </GlassPanel>

          {answers.length > 0 && (
            <GlassPanel className="rise-in" style={{ "--stagger": 1 } as React.CSSProperties}>
              <PanelHeader title="Answers" />
              <dl className="flex flex-col gap-4">
                {answers.map((answer, i) => (
                  <div key={i}>
                    <dt className="text-[13px] font-medium text-muted">{answer.label}</dt>
                    <dd className={answer.value === null ? "mt-0.5 text-sm italic text-muted" : "mt-0.5 whitespace-pre-line text-sm"}>
                      {answer.kind === "url" && typeof answer.value === "string" ? (
                        <a href={answer.value} target="_blank" rel="noopener noreferrer nofollow" className="break-all text-link hover:underline">
                          {answer.value}
                        </a>
                      ) : (
                        answerText(answer.value)
                      )}
                    </dd>
                  </div>
                ))}
              </dl>
            </GlassPanel>
          )}

          {a.coverLetter && (
            <GlassPanel className="rise-in" style={{ "--stagger": 2 } as React.CSSProperties}>
              <PanelHeader title="Note from the candidate" />
              <p className="whitespace-pre-line text-sm leading-relaxed">{a.coverLetter}</p>
            </GlassPanel>
          )}
        </div>

        <aside className="flex min-w-0 flex-col gap-4 xl:sticky xl:top-5 xl:self-start">
          <GlassPanel>
            <PanelHeader title="Contact" />
            <ul className="flex flex-col gap-2.5 text-sm">
              <li className="flex items-center gap-2.5">
                <Mail className="h-4 w-4 shrink-0 text-muted" aria-hidden />
                <a href={`mailto:${a.email}`} className="truncate text-link hover:underline">
                  {a.email}
                </a>
              </li>
              <li className="flex items-center gap-2.5">
                <Phone className="h-4 w-4 shrink-0 text-muted" aria-hidden />
                <a href={`tel:${a.phone.replace(/[^\d+]/g, "")}`} className="text-link hover:underline">
                  {a.phone}
                </a>
              </li>
              {a.location && (
                <li className="flex items-center gap-2.5">
                  <MapPin className="h-4 w-4 shrink-0 text-muted" aria-hidden />
                  {a.location}
                </li>
              )}
              {a.linkedinUrl && (
                <li className="flex items-center gap-2.5">
                  <Link2 className="h-4 w-4 shrink-0 text-muted" aria-hidden />
                  <a href={a.linkedinUrl} target="_blank" rel="noopener noreferrer nofollow" className="truncate text-link hover:underline">
                    LinkedIn profile
                  </a>
                </li>
              )}
            </ul>
          </GlassPanel>
          <ApplicationReview id={a.id} name={a.name} status={a.status} events={events} submittedAt={a.createdAt} />
        </aside>
      </div>
    </>
  );
}
