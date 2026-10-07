import { redirect } from "next/navigation";
import { CommandPalette } from "@/components/admin/CommandPalette";
import { GlassShell } from "@/components/admin/Glass";
import { Sidebar } from "@/components/admin/Sidebar";
import { Topbar } from "@/components/admin/Topbar";
import type { NavBadges } from "@/components/admin/nav";
import { requireUser } from "@/lib/auth/require-user";
import { isStaff } from "@/lib/auth/roles";
import { apiFetch } from "@/lib/api/client";

/** The floating glass shell: sidebar + content. Every page inside still checks access itself. */
export default async function AdminLayout({ children }: LayoutProps<"/">) {
  const user = await requireUser();
  if (user.mustChangePassword) redirect("/account/password");
  // Staff-only counters; company accounts never query (or see) the inbox.
  const badges: NavBadges = {};
  if (isStaff(user.role)) {
    Object.assign(badges, await apiFetch<NavBadges>("/dashboard/badges"));
  }

  return (
    <div className="min-h-dvh md:p-4 xl:p-5">
      <GlassShell className="flex min-h-dvh md:overflow-clip !rounded-none !border-0 md:min-h-[calc(100dvh-2rem)] md:!rounded-[var(--radius-shell)] md:!border xl:min-h-[calc(100dvh-2.5rem)]">
        <Sidebar user={user} badges={badges} />
        <div className="min-w-0 flex-1 px-4 pb-24 pt-0 md:px-6 md:py-6 md:pb-8 xl:px-8">
          <Topbar user={user} badges={badges} />
          <main id="main">{children}</main>
        </div>
      </GlassShell>
      <CommandPalette role={user.role} />
    </div>
  );
}
