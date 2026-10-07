"use server";

import { z } from "zod";
import { apiFetch } from "@/lib/api/client";
import { requireUser } from "@/lib/auth/require-user";
import { setThemeCookie } from "@/lib/theme";

const themeSchema = z.enum(["light", "dark", "system"]);

/** Saves the theme for this user (in the API) and mirrors it to a cookie for first paint. */
export async function saveTheme(theme: string): Promise<void> {
  await requireUser();
  const value = themeSchema.parse(theme);
  await apiFetch("/me/theme", { method: "PUT", body: { theme: value } });
  await setThemeCookie(value);
}

/** Before sign-in (login page toggle) only the cookie is set. */
export async function saveThemeCookieOnly(theme: string): Promise<void> {
  await setThemeCookie(themeSchema.parse(theme));
}
