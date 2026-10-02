"use server";

import { z } from "zod";
import { getDb } from "@/db";
import { userPrefs } from "@/db/schema";
import { requireUser } from "@/lib/auth/require-user";
import { setThemeCookie } from "@/lib/theme";

const themeSchema = z.enum(["light", "dark", "system"]);

/** Saves the theme for this user (user_prefs) and mirrors it to a cookie for first paint. */
export async function saveTheme(theme: string): Promise<void> {
  const user = await requireUser();
  const value = themeSchema.parse(theme);
  await getDb()
    .insert(userPrefs)
    .values({ userId: user.id, theme: value })
    .onConflictDoUpdate({ target: userPrefs.userId, set: { theme: value } });
  await setThemeCookie(value);
}

/** Before sign-in (login page toggle) only the cookie is set. */
export async function saveThemeCookieOnly(theme: string): Promise<void> {
  await setThemeCookie(themeSchema.parse(theme));
}
