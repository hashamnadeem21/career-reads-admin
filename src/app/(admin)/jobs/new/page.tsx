import type { Metadata } from "next";
import { PageHeader } from "@/components/admin/Glass";
import { JobForm } from "@/components/jobs/JobForm";
import { emptyJob } from "@/lib/jobs/form-values";
import { requireUser } from "@/lib/auth/require-user";
import { companyOptions } from "@/lib/companies/queries";
import { getJobCategories } from "@/lib/jobs/queries";

export const metadata: Metadata = { title: "New job" };

export default async function NewJobPage() {
  const user = await requireUser();
  const isCompany = user.role === "company";
  const [categories, companies] = await Promise.all([getJobCategories(), isCompany ? Promise.resolve(undefined) : companyOptions()]);
  const initial = emptyJob();
  if (isCompany) initial.company = user.companyName ?? "";

  return (
    <>
      <PageHeader
        title="New job"
        description={
          isCompany && !user.companyAutoPublish
            ? "Fill in the details and submit it for review. The preview shows how it will look on /jobs."
            : "Fill in the details. The preview shows how it will look on /jobs."
        }
      />
      <JobForm
        initial={initial}
        categories={categories}
        companies={companies}
        company={isCompany ? { name: user.companyName ?? "", autoPublish: user.companyAutoPublish } : undefined}
      />
    </>
  );
}
