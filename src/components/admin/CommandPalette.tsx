"use client";

import { Command } from "cmdk";
import { Dialog } from "radix-ui";
import { Briefcase, FileText, Moon, Plus, Search, Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { searchEverything, type SearchHit } from "@/app/actions/search";
import type { Role } from "@/db/schema";
import { mainNav, bottomNav, visibleNav } from "./nav";
import { applyTheme } from "./ThemeSwitch";
import { saveTheme } from "@/app/actions/preferences";

export const OPEN_PALETTE_EVENT = "admin:open-command-palette";

export function openCommandPalette() {
  window.dispatchEvent(new Event(OPEN_PALETTE_EVENT));
}

const itemClass =
  "flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-ink data-[selected=true]:bg-primary data-[selected=true]:text-primary-ink [&_svg]:h-4 [&_svg]:w-4 [&_svg]:shrink-0";
const groupClass = "[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:pb-1 [&_[cmdk-group-heading]]:pt-3 [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-faint";

/** ⌘K / Ctrl K: jump to pages, run actions, and search posts and jobs. */
export function CommandPalette({ role }: { role: Role }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [, startTransition] = useTransition();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // Autofill fires keydown events without a `key`, so guard before using it.
      if (typeof e.key === "string" && e.key.toLowerCase() === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    const onOpen = () => setOpen(true);
    window.addEventListener("keydown", onKey);
    window.addEventListener(OPEN_PALETTE_EVENT, onOpen);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener(OPEN_PALETTE_EVENT, onOpen);
    };
  }, []);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) return;
    const timer = setTimeout(() => startTransition(async () => setHits(await searchEverything(q))), 180);
    return () => clearTimeout(timer);
  }, [query]);

  const go = (href: string) => {
    setOpen(false);
    setQuery("");
    router.push(href);
  };

  const pages = [...visibleNav(mainNav, role), ...visibleNav(bottomNav, role)];
  const visibleHits = query.trim().length >= 2 ? hits : [];

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-[var(--overlay)] backdrop-blur-sm" />
        <Dialog.Content className="glass-strong fixed left-1/2 top-[12vh] z-50 w-[min(92vw,620px)] -translate-x-1/2 overflow-hidden p-0 text-ink">
          <Dialog.Title className="sr-only">Command palette</Dialog.Title>
          <Dialog.Description className="sr-only">Search pages, posts and jobs, or run an action.</Dialog.Description>
          <Command label="Command palette" shouldFilter loop>
            <div className="flex items-center gap-3 border-b border-divider px-4">
              <Search className="h-4 w-4 text-muted" aria-hidden />
              <Command.Input
                value={query}
                onValueChange={setQuery}
                placeholder="Search posts, jobs and pages…"
                className="h-14 flex-1 bg-transparent text-[15px] outline-none placeholder:text-faint focus-visible:shadow-none focus-visible:outline-none"
              />
              <kbd className="rounded-md border border-divider px-1.5 py-0.5 text-[11px] text-faint">Esc</kbd>
            </div>
            <Command.List className="admin-scroll max-h-[min(60vh,420px)] overflow-y-auto p-2">
              <Command.Empty className="px-3 py-8 text-center text-sm text-muted">Nothing found.</Command.Empty>
              {visibleHits.length > 0 && (
                <Command.Group heading="Content" className={groupClass}>
                  {visibleHits.map((hit) => (
                    <Command.Item key={hit.href} value={`${hit.kind} ${hit.title} ${hit.slug}`} onSelect={() => go(hit.href)} className={itemClass}>
                      {hit.kind === "job" ? <Briefcase /> : <FileText />}
                      <span className="min-w-0 flex-1 truncate">{hit.title}</span>
                      <span className="text-xs opacity-70">{hit.kind === "job" ? "Job" : "Post"}</span>
                    </Command.Item>
                  ))}
                </Command.Group>
              )}
              <Command.Group heading="Actions" className={groupClass}>
                <Command.Item onSelect={() => go("/posts/new")} className={itemClass}>
                  <Plus /> New post
                </Command.Item>
                <Command.Item onSelect={() => go("/jobs/new")} className={itemClass}>
                  <Plus /> New job
                </Command.Item>
                <Command.Item onSelect={() => go("/media?upload=1")} className={itemClass}>
                  <Upload /> Upload image
                </Command.Item>
                <Command.Item
                  onSelect={() => {
                    const next = document.documentElement.classList.contains("dark") ? "light" : "dark";
                    applyTheme(next);
                    startTransition(() => saveTheme(next));
                    setOpen(false);
                  }}
                  className={itemClass}
                >
                  <Moon /> Toggle dark mode
                </Command.Item>
              </Command.Group>
              <Command.Group heading="Pages" className={groupClass}>
                {pages.map((p) => (
                  <Command.Item key={p.href} value={`page ${p.label}`} onSelect={() => go(p.href)} className={itemClass}>
                    <p.icon /> {p.label}
                  </Command.Item>
                ))}
              </Command.Group>
            </Command.List>
          </Command>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
