import { eq } from "drizzle-orm";
import { CalendarClock, FilePen, Hourglass, TrendingUp } from "lucide-react";
import { PageHeader } from "@/components/admin/Glass";
import { DashboardGrid } from "@/components/dashboard/DashboardGrid";
import { ProgressList } from "@/components/dashboard/ProgressList";
import { DashboardRail } from "@/components/dashboard/Rail";
import { RecentTable } from "@/components/dashboard/RecentTable";
import { StatCard } from "@/components/dashboard/StatCard";
import { TrafficCard } from "@/components/dashboard/TrafficCard";
import { WorkList } from "@/components/dashboard/WorkList";
import { getDb } from "@/db";
import { userPrefs } from "@/db/schema";
import { requireUser } from "@/lib/auth/require-user";
import { resolveLayout } from "@/lib/dashboard/layout";
import {
  getActivity,
  getContentMix,
  getFeaturedJob,
  getRecentContent,
  getStatCards,
  getTopJobCategories,
  getTraffic,
  getWorkLists,
} from "@/lib/dashboard/queries";
import { siteUrl } from "@/lib/site-url";

export default async function DashboardPage() {
  const user = await requireUser();
  const [stats, traffic, topCategories, mix, recent, lists, featured, activity, [prefs]] = await Promise.all([
    getStatCards(),
    getTraffic(),
    getTopJobCategories(),
    getContentMix(),
    getRecentContent(),
    getWorkLists(),
    getFeaturedJob(),
    getActivity(8),
    getDb().select().from(userPrefs).where(eq(userPrefs.userId, user.id)).limit(1),
  ]);

  const statCards = (
    <div className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-1 md:mx-0 md:grid md:grid-cols-2 md:overflow-visible md:px-0 md:pb-0 xl:grid-cols-4 [&>*]:w-[78vw] [&>*]:shrink-0 [&>*]:snap-start md:[&>*]:w-auto">
      <StatCard index={0} title="Published posts" stat={stats.posts} color="var(--chart-1)" href="/posts?status=live" hrefLabel="View live posts" sparkLabel="Trend: live posts over the last 12 weeks." />
      <StatCard index={1} title="Active jobs" stat={stats.jobs} color="var(--chart-2)" href="/jobs?status=live" hrefLabel="View active jobs" sparkLabel="Trend: active jobs over the last 12 weeks." />
      <StatCard index={2} title="Subscribers" stat={stats.subscribers} color="var(--chart-3)" href="/messages?tab=subscribers" hrefLabel="View subscribers" sparkLabel="Trend: newsletter subscribers over the last 12 weeks." />
      <StatCard index={3} title="Unread messages" stat={stats.unreadMessages} showDelta={false} color="var(--chart-4)" href="/messages" hrefLabel="Open inbox" sparkLabel="Messages received per day over the last 14 days." />
    </div>
  );

  return (
    <>
      <PageHeader title="My Dashboard" />
      <DashboardGrid
        initialLayout={resolveLayout(prefs?.dashboardLayout)}
        mix={mix}
        cards={{
          stats: statCards,
          traffic: <TrafficCard points={traffic.points} total={traffic.total} />,
          "top-categories": (
            <ProgressList
              title="Top job categories"
              description="Job page views, last 30 days"
              unit="views"
              items={topCategories.map((c) => ({ key: c.slug, label: c.name, value: c.value }))}
              empty="No job views yet"
              emptyIcon={TrendingUp}
            />
          ),
          recent: <RecentTable rows={recent.map((r) => ({ ...r, imageUrl: r.image ? siteUrl(r.image) : null }))} />,
          drafts: <WorkList title="Drafts" items={lists.drafts} empty="No drafts" icon={FilePen} />,
          scheduled: <WorkList title="Scheduled posts" items={lists.scheduled} empty="Nothing scheduled" icon={CalendarClock} />,
          expiring: <WorkList title="Jobs closing this week" items={lists.expiring} empty="No jobs close in the next 7 days" icon={Hourglass} showDate={false} />,
          rail: <DashboardRail user={user} featured={featured} activity={activity} />,
        }}
      />
    </>
  );
}
