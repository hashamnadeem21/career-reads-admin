import { ExternalLink } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/admin/Badge";
import { PageHeader } from "@/components/admin/Glass";
import { Notice } from "@/components/admin/Notice";
import { CompanyActions } from "@/components/companies/CompanyActions";
import { CompanyStats } from "@/components/companies/CompanyDashboard";
import { CompanyPeople } from "@/components/companies/CompanyPeople";
import { requireSuperAdmin } from "@/lib/auth/require-user";
import { getCompany, getCompanyPeople } from "@/lib/companies/queries";

export async function generateMetadata({ params }: PageProps<"/companies/[id]">): Promise<Metadata> {
  await requireSuperAdmin();
  const company = await getCompany((await params).id);
  return { title: company?.name ?? "Company not found" };
}

/** Super admins only: one company's settings, people, and how its jobs perform. */
export default async function CompanyPage({ params }: PageProps<"/companies/[id]">) {
  await requireSuperAdmin();
  const company = await getCompany((await params).id);
  if (!company) notFound();
  const people = await getCompanyPeople(company.id);
  const fileSlug = company.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "company";

  return (
    <>
      <Notice />
      <PageHeader
        title={
          <span className="flex flex-wrap items-center gap-3">
            {company.name}
            {!company.active && <Badge tone="danger">Paused</Badge>}
            <Badge tone={company.autoPublish ? "success" : "neutral"}>{company.autoPublish ? "Trusted · publishes directly" : "Jobs need review"}</Badge>
          </span>
        }
        description={
          <span className="flex flex-wrap items-center gap-3">
            {company.website && (
              <a href={company.website} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-link hover:underline">
                {company.website.replace(/^https?:\/\//, "")} <ExternalLink className="h-3.5 w-3.5" aria-hidden />
              </a>
            )}
            <Link href={`/jobs?company=${company.id}`} className="font-medium text-link hover:underline">
              Manage their jobs →
            </Link>
          </span>
        }
        actions={
          <CompanyActions
            active={company.active}
            company={{ id: company.id, name: company.name, website: company.website ?? "", autoPublish: company.autoPublish }}
          />
        }
      />
      <div className="grid gap-5 2xl:grid-cols-[minmax(0,1fr)_380px]">
        <CompanyStats companyId={company.id} fileName={`${fileSlug}-jobs-traffic`} jobsLink={`/jobs?company=${company.id}&`} />
        <div className="2xl:sticky 2xl:top-5 2xl:self-start">
          <CompanyPeople
            companyId={company.id}
            companyName={company.name}
            active={company.active}
            members={people.members.map((m) => ({ ...m, createdAt: m.createdAt.toISOString() }))}
            invites={people.pending.map((i) => ({ ...i, expiresAt: i.expiresAt.toISOString() }))}
          />
        </div>
      </div>
    </>
  );
}
