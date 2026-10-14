import {
  Briefcase,
  Building2,
  FileText,
  FileUser,
  FolderTree,
  Image as ImageIcon,
  LayoutDashboard,
  Mail,
  Newspaper,
  Settings,
  UserRound,
  Users,
  Zap,
  type LucideIcon,
} from "lucide-react";
import type { Role } from "@/lib/api/types";
import { STAFF_ROLES } from "@/lib/auth/roles";

export interface NavEntry {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Roles that see this entry. Omit for everyone. The pages enforce the same rule on the server. */
  roles?: readonly Role[];
  badgeKey?: keyof NavBadges;
}

export interface NavBadges {
  unreadMessages?: number;
  /** Company jobs waiting for review (staff only). */
  pendingJobs?: number;
  /** Applications on Career Reads nobody has opened yet. */
  newApplications?: number;
}

const STAFF = STAFF_ROLES;
const SUPER = ["super_admin"] as const;

export const mainNav: NavEntry[] = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/posts", label: "Posts", icon: FileText, roles: STAFF },
  { href: "/jobs", label: "Jobs", icon: Briefcase, badgeKey: "pendingJobs" },
  { href: "/applications", label: "Applicants", icon: FileUser, badgeKey: "newApplications" },
  { href: "/companies", label: "Companies", icon: Building2, roles: SUPER },
  { href: "/categories", label: "Categories", icon: FolderTree, roles: STAFF },
  { href: "/authors", label: "Authors", icon: UserRound, roles: STAFF },
  { href: "/media", label: "Media", icon: ImageIcon, roles: STAFF },
  { href: "/messages", label: "Messages", icon: Mail, badgeKey: "unreadMessages", roles: STAFF },
  { href: "/newsletters", label: "Newsletters", icon: Newspaper, roles: STAFF },
  { href: "/automations", label: "Automations", icon: Zap, roles: STAFF },
  { href: "/users", label: "Users", icon: Users, roles: SUPER },
];

export const bottomNav: NavEntry[] = [{ href: "/settings", label: "Settings", icon: Settings, roles: SUPER }];

export function visibleNav(entries: NavEntry[], role: Role): NavEntry[] {
  return entries.filter((e) => !e.roles || e.roles.includes(role));
}

export function isActive(pathname: string, href: string): boolean {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}
