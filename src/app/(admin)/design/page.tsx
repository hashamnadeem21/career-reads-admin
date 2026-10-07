import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/admin/Glass";
import { StyleGuide } from "@/components/design/StyleGuide";
import { requireStaff } from "@/lib/auth/require-user";
import { isProduction } from "@/lib/env";

export const metadata: Metadata = { title: "Design system" };

/** Dev-only reference of every component in both themes (docs/ADMIN_DESIGN.md). */
export default async function DesignPage() {
  await requireStaff();
  if (isProduction && process.env.ADMIN_STYLE_GUIDE !== "true") notFound();
  return (
    <>
      <PageHeader title="Design system" description="Every component in Aurora (light) and Ember (dark). Reference for new screens." />
      <StyleGuide />
    </>
  );
}
