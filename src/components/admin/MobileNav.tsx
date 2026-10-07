"use client";

import { CircleHelp, Menu } from "lucide-react";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { isStaff } from "@/lib/auth/roles";
import type { SessionUser } from "@/lib/auth/session";
import { Button } from "./Button";
import { GlassDrawer } from "./GlassDialog";
import { bottomNav, isActive, visibleNav } from "./nav";
import { NavItem, NavList, UserCard, type NavBadges } from "./Sidebar";
import { ThemeSwitch } from "./ThemeSwitch";

/** Phones: the sidebar becomes a glass slide-over drawer opened from the top bar. */
export function MobileNav({ user, badges }: { user: SessionUser; badges: NavBadges }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const close = () => setOpen(false);
  return (
    <GlassDrawer
      side="left"
      open={open}
      onOpenChange={setOpen}
      title={user.companyName ?? "Career Reads Admin"}
      trigger={
        <Button variant="secondary" size="icon" className="md:hidden" aria-label="Open menu">
          <Menu />
        </Button>
      }
    >
      <div className="flex min-h-full flex-col gap-4">
        <NavList user={user} badges={badges} onNavigate={close} />
        <div className="mt-auto flex flex-col gap-1 border-t border-divider pt-4">
          {visibleNav(bottomNav, user.role).map((entry) => (
            <NavItem key={entry.href} entry={entry} onNavigate={close} active={isActive(pathname, entry.href)} />
          ))}
          {isStaff(user.role) && <NavItem entry={{ href: "/help", label: "Help", icon: CircleHelp }} onNavigate={close} active={pathname === "/help"} />}
          <div className="px-3.5 py-2">
            <ThemeSwitch />
          </div>
          <UserCard user={user} />
        </div>
      </div>
    </GlassDrawer>
  );
}
