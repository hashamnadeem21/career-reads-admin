import { count } from "drizzle-orm";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { buttonClasses } from "@/components/admin/Button";
import { GlassPanel, PageHeader } from "@/components/admin/Glass";
import { ActivityFeed } from "@/components/dashboard/Rail";
import { getDb } from "@/db";
import { auditLog } from "@/db/schema";
import { requireUser } from "@/lib/auth/require-user";
import { getActivity } from "@/lib/dashboard/queries";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Activity" };
const PAGE_SIZE = 30;

/** Everything changed in the admin, newest first (from audit_log). */
export default async function ActivityPage({ searchParams }: PageProps<"/activity">) {
  await requireUser();
  const raw = Number.parseInt(String((await searchParams).page ?? "1"), 10);
  const page = Number.isFinite(raw) && raw > 0 ? raw : 1;
  const [items, [{ total }]] = await Promise.all([getActivity(PAGE_SIZE, (page - 1) * PAGE_SIZE), getDb().select({ total: count() }).from(auditLog)]);
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  return (
    <>
      <PageHeader title="Activity" description="Who changed what, newest first." />
      <GlassPanel className="rise-in">
        <ActivityFeed items={items} />
        {pages > 1 && (
          <nav aria-label="Pagination" className="mt-6 flex items-center justify-end gap-2 text-sm text-muted">
            <Link href={`/activity?page=${page - 1}`} aria-disabled={page <= 1} className={buttonClasses({ size: "icon-sm", className: cn(page <= 1 && "pointer-events-none opacity-40") })} aria-label="Newer">
              <ChevronLeft />
            </Link>
            <span className="num">
              Page {page} of {pages}
            </span>
            <Link href={`/activity?page=${page + 1}`} aria-disabled={page >= pages} className={buttonClasses({ size: "icon-sm", className: cn(page >= pages && "pointer-events-none opacity-40") })} aria-label="Older">
              <ChevronRight />
            </Link>
          </nav>
        )}
      </GlassPanel>
    </>
  );
}
