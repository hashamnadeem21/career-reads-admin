import { LayoutDashboard } from "lucide-react";
import { EmptyState } from "@/components/admin/EmptyState";
import { GlassPanel } from "@/components/admin/Glass";
import { requireUser } from "@/lib/auth/require-user";

export default async function DashboardPage() {
  await requireUser();
  return (
    <GlassPanel>
      <EmptyState icon={LayoutDashboard} title="Your dashboard is on its way" description="Stats and charts arrive in the next phase." />
    </GlassPanel>
  );
}
