import { Briefcase, Clock, FilePlus2, History, Mail, MapPin, Upload } from "lucide-react";
import Link from "next/link";
import { Avatar } from "@/components/admin/Avatar";
import { Badge } from "@/components/admin/Badge";
import { EmptyState } from "@/components/admin/EmptyState";
import { PanelHeader } from "@/components/admin/Glass";
import type { ActivityItem } from "@/lib/dashboard/queries";
import type { SessionUser } from "@/lib/auth/session";
import { timeAgo } from "@/lib/utils";

const actions = [
  { href: "/posts/new", label: "New post", icon: FilePlus2 },
  { href: "/jobs/new", label: "New job", icon: Briefcase },
  { href: "/media?upload=1", label: "Upload", icon: Upload },
  { href: "/messages", label: "Messages", icon: Mail },
];

export function QuickActions() {
  return (
    <ul className="grid grid-cols-4 gap-2">
      {actions.map((a) => (
        <li key={a.href}>
          <Link href={a.href} className="group flex flex-col items-center gap-1.5 text-center text-xs font-medium text-muted hover:text-ink">
            <span className="glass-inset lift flex h-12 w-12 items-center justify-center !rounded-full text-link group-hover:bg-hover">
              <a.icon className="h-5 w-5" aria-hidden />
            </span>
            {a.label}
          </Link>
        </li>
      ))}
    </ul>
  );
}

export function FeaturedJobCard({ job }: { job: { slug: string; title: string; company: string; location: string; daysLeft: number | null } | null }) {
  if (!job) {
    return (
      <div className="glass-inset p-4">
        <EmptyState compact icon={Briefcase} title="No featured job" description="Mark a job as featured to pin it here and on /jobs." />
      </div>
    );
  }
  return (
    <Link
      href={`/jobs/${job.slug}`}
      className="lift relative block overflow-hidden rounded-[var(--radius-panel)] bg-gradient-to-br from-[#f59e0b] via-[#f97316] to-[#c2410c] p-5 text-white shadow-[0_20px_40px_-20px_rgb(234_88_12/0.7)]"
    >
      {/* Soft noise for the "card" texture. */}
      <svg className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.12] mix-blend-overlay" aria-hidden>
        <filter id="featured-noise">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch" />
        </filter>
        <rect width="100%" height="100%" filter="url(#featured-noise)" />
      </svg>
      <div className="relative">
        <p className="text-xs font-semibold uppercase tracking-wider text-white/80">Featured job</p>
        <p className="mt-6 text-lg font-bold leading-snug">{job.title}</p>
        <p className="mt-1 text-sm text-white/90">{job.company}</p>
        <div className="mt-5 flex items-center justify-between text-xs font-medium text-white/90">
          <span className="inline-flex items-center gap-1">
            <MapPin className="h-3.5 w-3.5" aria-hidden /> {job.location}
          </span>
          {job.daysLeft !== null && (
            <span className="inline-flex items-center gap-1 rounded-full bg-black/20 px-2 py-0.5">
              <Clock className="h-3.5 w-3.5" aria-hidden />
              {job.daysLeft === 0 ? "Closes today" : `Closes in ${job.daysLeft} day${job.daysLeft === 1 ? "" : "s"}`}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

const important = new Set(["published", "deleted", "role changed", "removed", "invited"]);

export function ActivityFeed({ items, compact }: { items: ActivityItem[]; compact?: boolean }) {
  if (items.length === 0) {
    return <EmptyState compact icon={History} title="No activity yet" description="Changes to posts, jobs and settings will show up here." />;
  }
  return (
    <ol className="flex flex-col gap-3">
      {items.map((item) => (
        <li key={item.id} className="flex items-start gap-3 text-sm">
          <Avatar name={item.userName ?? "Removed user"} size={compact ? 28 : 32} />
          <p className="min-w-0 flex-1 leading-snug">
            <span className="font-semibold">{item.userName ?? "A removed user"}</span>{" "}
            {important.has(item.action) ? <Badge tone="warning">{item.action}</Badge> : <span className="text-muted">{item.action}</span>}{" "}
            {item.href ? (
              <Link href={item.href} className="font-medium italic hover:text-link">
                {item.label ?? item.entity}
              </Link>
            ) : (
              <span className="font-medium italic">{item.label ?? item.entity}</span>
            )}
            <span className="block text-xs text-faint">
              <time dateTime={item.createdAt}>{timeAgo(item.createdAt)}</time>
            </span>
          </p>
        </li>
      ))}
    </ol>
  );
}

/** Right rail on wide screens: profile, quick actions, featured job and activity. */
export function DashboardRail({
  user,
  featured,
  activity,
}: {
  user: SessionUser;
  featured: Parameters<typeof FeaturedJobCard>[0]["job"];
  activity: ActivityItem[];
}) {
  return (
    <aside className="glass rise-in flex flex-col gap-6 p-5" aria-label="Shortcuts and activity">
      <div className="flex flex-col items-center text-center">
        <Avatar name={user.name} size={64} className="text-lg" />
        <p className="mt-3 font-semibold">{user.name}</p>
        <Badge tone={user.role === "admin" ? "info" : "warning"} className="mt-1 capitalize">
          {user.role}
        </Badge>
      </div>
      <QuickActions />
      <FeaturedJobCard job={featured} />
      <div>
        <PanelHeader
          title="Activity"
          actions={
            activity.length > 0 && (
              <Link href="/activity" className="text-xs font-semibold text-link hover:underline">
                View all
              </Link>
            )
          }
          className="mb-3"
        />
        <ActivityFeed items={activity} compact />
      </div>
    </aside>
  );
}
