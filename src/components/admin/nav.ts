import {
  Briefcase,
  FileText,
  FolderTree,
  Image as ImageIcon,
  LayoutDashboard,
  Mail,
  Settings,
  UserRound,
  Users,
  type LucideIcon,
} from "lucide-react";
import type { Role } from "@/db/schema";

export interface NavEntry {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Only shown to (and allowed for) this role. */
  role?: Role;
  badgeKey?: "unreadMessages";
}

export const mainNav: NavEntry[] = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/posts", label: "Posts", icon: FileText },
  { href: "/jobs", label: "Jobs", icon: Briefcase },
  { href: "/categories", label: "Categories", icon: FolderTree },
  { href: "/authors", label: "Authors", icon: UserRound },
  { href: "/media", label: "Media", icon: ImageIcon },
  { href: "/messages", label: "Messages", icon: Mail, badgeKey: "unreadMessages" },
  { href: "/users", label: "Users", icon: Users, role: "admin" },
];

export const bottomNav: NavEntry[] = [{ href: "/settings", label: "Settings", icon: Settings, role: "admin" }];

export function visibleNav(entries: NavEntry[], role: Role): NavEntry[] {
  return entries.filter((e) => !e.role || e.role === role);
}

export function isActive(pathname: string, href: string): boolean {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}
