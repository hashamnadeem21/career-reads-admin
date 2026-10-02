"use client";

import { Moon } from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import { saveTheme, saveThemeCookieOnly } from "@/app/actions/preferences";
import { cn } from "@/lib/utils";
import { Switch } from "./Field";

/** Applies a theme to <html> immediately (no reload). */
export function applyTheme(theme: "light" | "dark" | "system") {
  const root = document.documentElement;
  const dark = theme === "dark" || (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  root.classList.toggle("dark", dark);
  root.dataset.theme = theme;
}

function useIsDark() {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    const root = document.documentElement;
    const sync = () => setDark(root.classList.contains("dark"));
    sync();
    const observer = new MutationObserver(sync);
    observer.observe(root, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);
  return dark;
}

/** Sidebar "Dark mode" switch. Saves to user_prefs when signed in. */
export function ThemeSwitch({ signedIn = true, compact }: { signedIn?: boolean; compact?: boolean }) {
  const dark = useIsDark();
  const [, startTransition] = useTransition();

  const toggle = (next: boolean) => {
    const theme = next ? "dark" : "light";
    applyTheme(theme);
    startTransition(() => (signedIn ? saveTheme(theme) : saveThemeCookieOnly(theme)));
  };

  if (compact) {
    return (
      <button
        type="button"
        role="switch"
        aria-checked={dark}
        aria-label="Dark mode"
        onClick={() => toggle(!dark)}
        className={cn("flex h-10 w-10 items-center justify-center rounded-full transition hover:bg-hover", dark && "text-accent")}
      >
        <Moon className="h-[18px] w-[18px]" />
      </button>
    );
  }

  return (
    <Switch
      id="theme-switch"
      label={
        <span className="flex items-center gap-2.5">
          <Moon className="h-[18px] w-[18px] text-muted" aria-hidden />
          Dark mode
        </span>
      }
      checked={dark}
      onCheckedChange={toggle}
    />
  );
}
