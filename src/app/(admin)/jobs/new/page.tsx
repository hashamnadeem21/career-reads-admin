import type { Metadata } from "next";
import { PageHeader } from "@/components/admin/Glass";
import { JobForm } from "@/components/jobs/JobForm";
import { emptyJob } from "@/lib/jobs/form-values";
import { requireUser } from "@/lib/auth/require-user";
import { getJobCategories } from "@/lib/jobs/queries";

export const metadata: Metadata = { title: "New job" };

export default async function NewJobPage() {
  await requireUser();
  const categories = await getJobCategories();
  return (
    <>
      <PageHeader title="New job" description="Fill in the details. The preview shows how it will look on /jobs." />
      <JobForm initial={emptyJob()} categories={categories} />
    </>
  );
}
