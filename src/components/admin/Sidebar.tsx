"use client";

import { DropdownMenu } from "radix-ui";
import { ChevronsUpDown, CircleHelp, KeyRound, LogOut, Search, Zap } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { logout } from "@/app/actions/auth";
import type { SessionUser } from "@/lib/auth/session";
import { cn } from "@/lib/utils";
import { Avatar } from "./Avatar";
import { openCommandPalette } from "./CommandPalette";
import { Logo } from "./Logo";
import { bottomNav, isActive, mainNav, visibleNav, type NavEntry } from "./nav";
import { ThemeSwitch } from "./ThemeSwitch";
import { Tooltip } from "./Tooltip";

export interface NavBadges {
  unreadMessages?: number;
}

/** One nav link. `rail` = icon-only (tablet); labels show from xl up. */
export function NavItem({ entry, active, badge, rail, onNavigate }: { entry: NavEntry; active: boolean; badge?: number; rail?: boolean; onNavigate?: () => void }) {
  const Icon = entry.icon;
  const link = (
    <Link
      href={entry.href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group relative flex h-11 items-center gap-3 rounded-full px-3.5 text-sm font-medium transition",
        rail && "justify-center px-0 xl:justify-start xl:px-3.5",
        active ? "glow-primary bg-primary text-primary-ink" : "text-muted hover:bg-hover hover:text-ink",
      )}
    >
      <Icon className="h-[18px] w-[18px] shrink-0" aria-hidden />
      <span className={cn("truncate", rail && "sr-only xl:not-sr-only")}>{entry.label}</span>
      {badge ? (
        <span
          className={cn(
            "num ml-auto min-w-5 rounded-full px-1.5 text-center text-[11px] font-bold leading-5",
            active ? "bg-white/25 text-white" : "bg-danger text-white dark:text-zinc-950",
            rail && "absolute right-1 top-1 ml-0 min-w-4 px-1 text-[10px] leading-4 xl:static xl:ml-auto xl:min-w-5 xl:px-1.5 xl:text-[11px] xl:leading-5",
          )}
        >
          <span className="sr-only">, </span>
          {badge}
          <span className="sr-only"> unread</span>
        </span>
      ) : null}
    </Link>
  );
  return rail ? (
    <Tooltip content={<span className="xl:hidden">{entry.label}</span>}>{link}</Tooltip>
  ) : (
    link
  );
}

export function NavList({ user, badges, rail, onNavigate }: { user: SessionUser; badges: NavBadges; rail?: boolean; onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Main" className="flex flex-col gap-1">
      {visibleNav(mainNav, user.role).map((entry) => (
        <NavItem
          key={entry.href}
          entry={entry}
          rail={rail}
          onNavigate={onNavigate}
          active={isActive(pathname, entry.href)}
          badge={entry.badgeKey ? badges[entry.badgeKey] : undefined}
        />
      ))}
      <p className={cn("mb-1 mt-5 px-3.5 text-[11px] font-semibold uppercase tracking-wider text-faint", rail && "sr-only xl:not-sr-only")}>Apps</p>
      <NavItem
        entry={{ href: "/posts/new", label: "Quick post", icon: Zap }}
        rail={rail}
        onNavigate={onNavigate}
        active={pathname === "/posts/new"}
      />
    </nav>
  );
}

export function UserCard({ user, rail }: { user: SessionUser; rail?: boolean }) {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          className={cn(
            "flex w-full items-center gap-3 rounded-2xl p-2 text-left transition hover:bg-hover",
            rail && "justify-center xl:justify-start",
          )}
          aria-label={`Account menu for ${user.name}`}
        >
          <Avatar name={user.name} size={36} />
          <span className={cn("min-w-0 flex-1", rail && "hidden xl:block")}>
            <span className="block truncate text-sm font-semibold">{user.name}</span>
            <span className="block truncate text-xs capitalize text-muted">{user.role}</span>
          </span>
          <ChevronsUpDown className={cn("h-4 w-4 text-muted", rail && "hidden xl:block")} aria-hidden />
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content side="top" align="start" sideOffset={8} className="glass-strong z-50 min-w-56 !rounded-2xl p-1.5 text-ink">
          <div className="px-3 py-2">
            <p className="text-sm font-semibold">{user.name}</p>
            <p className="truncate text-xs text-muted">{user.email}</p>
          </div>
          <DropdownMenu.Separator className="my-1 h-px bg-divider" />
          <DropdownMenu.Item asChild className="flex cursor-pointer items-center gap-2 rounded-xl px-3 py-2 text-sm outline-none data-[highlighted]:bg-hover">
            <Link href="/account/password">
              <KeyRound className="h-4 w-4" /> Change password
            </Link>
          </DropdownMenu.Item>
          <DropdownMenu.Item
            onSelect={() => void logout()}
            className="flex cursor-pointer items-center gap-2 rounded-xl px-3 py-2 text-sm text-danger outline-none data-[highlighted]:bg-danger-soft"
          >
            <LogOut className="h-4 w-4" /> Sign out
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

function SearchField({ rail }: { rail?: boolean }) {
  return (
    <button
      type="button"
      onClick={openCommandPalette}
      className={cn(
        "flex h-10 w-full items-center gap-2.5 rounded-full border border-glass-border bg-inset px-3.5 text-sm text-faint transition hover:text-muted",
        rail && "justify-center px-0 xl:justify-start xl:px-3.5",
      )}
      aria-label="Search (Command K)"
    >
      <Search className="h-4 w-4 shrink-0" aria-hidden />
      <span className={cn("flex-1 text-left", rail && "hidden xl:block")}>Search…</span>
      <kbd className={cn("rounded-md border border-divider px-1.5 text-[11px]", rail && "hidden xl:block")}>⌘K</kbd>
    </button>
  );
}

/** Desktop sidebar (264px) that becomes a 76px icon rail on tablets. Hidden on phones (see MobileNav). */
export function Sidebar({ user, badges }: { user: SessionUser; badges: NavBadges }) {
  const pathname = usePathname();
  return (
    <aside className="hidden w-[76px] shrink-0 flex-col gap-5 self-start border-r border-divider bg-[var(--glass-sidebar)] px-3 py-5 md:sticky md:top-4 md:flex md:h-[calc(100dvh-2rem)] xl:top-5 xl:h-[calc(100dvh-2.5rem)] xl:w-[264px] xl:px-4">
      <Link href="/" className="flex justify-center rounded-xl xl:justify-start xl:px-1.5" aria-label="BlogNest Admin dashboard">
        <Logo className="xl:hidden" compact />
        <Logo className="hidden xl:flex" />
      </Link>
      <SearchField rail />
      <div className="admin-scroll -mx-1 flex-1 overflow-y-auto px-1">
        <NavList user={user} badges={badges} rail />
      </div>
      <div className="flex flex-col gap-1 border-t border-divider pt-4">
        {visibleNav(bottomNav, user.role).map((entry) => (
          <NavItem key={entry.href} entry={entry} rail active={isActive(pathname, entry.href)} />
        ))}
        <NavItem entry={{ href: "/help", label: "Help", icon: CircleHelp }} rail active={pathname === "/help"} />
        <div className="hidden px-3.5 py-2 xl:block">
          <ThemeSwitch />
        </div>
        <div className="flex justify-center xl:hidden">
          <ThemeSwitch compact />
        </div>
        <UserCard user={user} rail />
      </div>
    </aside>
  );
}
