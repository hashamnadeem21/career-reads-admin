import "server-only";
import { cookies } from "next/headers";
import { isProduction } from "@/lib/env";

export type Theme = "light" | "dark" | "system";
export const THEME_COOKIE = "bn_admin_theme";

export function parseTheme(value: string | undefined | null): Theme {
  return value === "light" || value === "dark" ? value : "system";
}

/** The theme to render with: the cookie mirrors the user's saved preference (user_prefs). */
export async function getThemeCookie(): Promise<Theme> {
  return parseTheme((await cookies()).get(THEME_COOKIE)?.value);
}

export async function setThemeCookie(theme: Theme): Promise<void> {
  (await cookies()).set(THEME_COOKIE, theme, {
    httpOnly: false,
    secure: isProduction,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
}
