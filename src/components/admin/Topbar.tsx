"use client";

import { DropdownMenu, Popover } from "radix-ui";
import { Bell, Briefcase, FileText, FolderTree, Plus, Search, SlidersHorizontal, Upload, UserRound } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import type { Role } from "@/lib/api/types";
import { isStaff } from "@/lib/auth/roles";
import type { SessionUser } from "@/lib/auth/session";
import { firstName } from "@/lib/utils";
import { Button } from "./Button";
import { openCommandPalette } from "./CommandPalette";
import { MobileNav } from "./MobileNav";
import type { NavBadges } from "./nav";

const newItems = [
  { href: "/posts/new", label: "Post", icon: FileText, staffOnly: true },
  { href: "/jobs/new", label: "Job", icon: Briefcase, staffOnly: false },
  { href: "/categories?new=1", label: "Category", icon: FolderTree, staffOnly: true },
  { href: "/authors?new=1", label: "Author", icon: UserRound, staffOnly: true },
  { href: "/media?upload=1", label: "Upload", icon: Upload, staffOnly: true },
];

const menuItem = "flex cursor-pointer items-center gap-2.5 rounded-xl px-3 py-2 text-sm outline-none data-[highlighted]:bg-hover [&_svg]:h-4 [&_svg]:w-4 [&_svg]:text-muted";

export function NewMenu({ trigger, role }: { trigger: ReactNode; role: Role }) {
  const items = newItems.filter((item) => isStaff(role) || !item.staffOnly);
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>{trigger}</DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content align="end" sideOffset={8} className="glass-strong z-50 min-w-48 !rounded-2xl p-1.5 text-ink">
          {items.map((item) => (
            <DropdownMenu.Item key={item.href} asChild className={menuItem}>
              <Link href={item.href}>
                <item.icon /> {item.label}
              </Link>
            </DropdownMenu.Item>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

/** Sticky top bar: greeting, search, notifications, Customize, + New. */
export const CUSTOMIZE_EVENT = "admin:customize-dashboard";

export function Topbar({ user, badges }: { user: SessionUser; badges: NavBadges }) {
  const unread = badges.unreadMessages ?? 0;
  const pendingJobs = badges.pendingJobs ?? 0;
  const pathname = usePathname();
  const onDashboard = pathname === "/";
  const staff = isStaff(user.role);
  const subtitle = onDashboard ? "Here's what's happening today" : (user.companyName ?? "Career Reads admin");
  return (
    <>
    <header className="sticky top-0 z-30 -mx-4 mb-6 flex items-center gap-3 border-b border-divider bg-[var(--glass-shell)] px-4 py-3 backdrop-blur-xl md:static md:mx-0 md:border-0 md:bg-transparent md:px-0 md:py-0 md:backdrop-blur-none">
      <MobileNav user={user} badges={badges} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-lg font-bold leading-tight md:text-[22px]">
          Hi, {firstName(user.name)} <span aria-hidden>👋</span>
        </p>
        <p className="hidden truncate text-sm text-muted sm:block">{subtitle}</p>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="secondary" size="icon" onClick={openCommandPalette} aria-label="Search (Command K)" className="hidden sm:inline-flex">
          <Search />
        </Button>
        {staff && (
          <Popover.Root>
            <Popover.Trigger asChild>
              <Button variant="secondary" size="icon" className="relative" aria-label={unread + pendingJobs ? `Notifications, ${unread + pendingJobs} new` : "Notifications"}>
                <Bell />
                {unread + pendingJobs > 0 && <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-danger ring-2 ring-[var(--glass-solid-fallback)]" aria-hidden />}
              </Button>
            </Popover.Trigger>
            <Popover.Portal>
              <Popover.Content align="end" sideOffset={8} className="glass-strong z-50 w-72 !rounded-2xl p-4 text-ink">
                <p className="text-sm font-semibold">Notifications</p>
                {pendingJobs > 0 && (
                  <Link href="/jobs?status=review" className="mt-3 flex items-center gap-3 rounded-xl bg-inset p-3 text-sm hover:bg-hover">
                    <span className="h-2 w-2 shrink-0 rounded-full bg-primary" aria-hidden />
                    {pendingJobs} {pendingJobs === 1 ? "job" : "jobs"} waiting for review
                  </Link>
                )}
                {unread > 0 && (
                  <Link href="/messages" className="mt-3 flex items-center gap-3 rounded-xl bg-inset p-3 text-sm hover:bg-hover">
                    <span className="h-2 w-2 shrink-0 rounded-full bg-primary" aria-hidden />
                    {unread} unread {unread === 1 ? "message" : "messages"}
                  </Link>
                )}
                {unread + pendingJobs === 0 && (
                  <p className="mt-2 text-sm text-muted">You&apos;re all caught up.</p>
                )}
              </Popover.Content>
            </Popover.Portal>
          </Popover.Root>
        )}
        {onDashboard && staff && (
          <Button variant="secondary" className="hidden lg:inline-flex" onClick={() => window.dispatchEvent(new Event(CUSTOMIZE_EVENT))}>
            <SlidersHorizontal /> Customize
          </Button>
        )}
        <NewMenu
          role={user.role}
          trigger={
            <Button variant="primary" className="hidden md:inline-flex" aria-label="Create new">
              <Plus /> New
            </Button>
          }
        />
      </div>
    </header>
    {/* Phones: "+ New" becomes a floating round button (outside the blurred header so `fixed` is viewport-relative). */}
      <div className="fixed bottom-5 right-5 z-40 md:hidden">
        <NewMenu
          role={user.role}
          trigger={
            <Button variant="primary" size="icon" className="h-14 w-14" aria-label="Create new">
              <Plus className="!h-6 !w-6" />
            </Button>
          }
        />
      </div>
    </>
  );
}
