import type { Metadata } from "next";
import { PageHeader } from "@/components/admin/Glass";
import { SettingsForm } from "@/components/settings/SettingsForm";
import { requireSuperAdmin } from "@/lib/auth/require-user";
import { getSettings } from "@/lib/settings";

export const metadata: Metadata = { title: "Settings" };

/** Admins only (editors get a 403). */
export default async function SettingsPage() {
  await requireSuperAdmin();
  return (
    <>
      <PageHeader title="Settings" description="Ads, contact details and social links for the public site." />
      <SettingsForm initial={await getSettings()} />
    </>
  );
}
