"use client";

import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface Choice<T extends string> {
  value: T;
  label: string;
  description?: ReactNode;
  icon?: LucideIcon;
}

/** A radio group drawn as cards: one choice is always picked. Arrow keys move between cards. */
export function ChoiceCards<T extends string>({
  label,
  value,
  onChange,
  choices,
  className,
}: {
  label: string;
  value: T;
  onChange: (value: T) => void;
  choices: Choice<T>[];
  className?: string;
}) {
  const move = (from: number, step: number) => {
    const next = choices[(from + step + choices.length) % choices.length];
    onChange(next.value);
    document.getElementById(`choice-${label}-${next.value}`)?.focus();
  };
  return (
    <div role="radiogroup" aria-label={label} className={cn("grid gap-2 sm:grid-cols-2", className)}>
      {choices.map((choice, i) => {
        const checked = choice.value === value;
        const Icon = choice.icon;
        return (
          <button
            key={choice.value}
            id={`choice-${label}-${choice.value}`}
            type="button"
            role="radio"
            aria-checked={checked}
            tabIndex={checked ? 0 : -1}
            onClick={() => onChange(choice.value)}
            onKeyDown={(e) => {
              const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
              if (!step) return;
              e.preventDefault();
              move(i, step);
            }}
            className={cn(
              "flex items-start gap-3 rounded-2xl border p-3 text-left transition",
              checked ? "border-primary bg-primary-soft" : "border-glass-border bg-inset hover:border-primary/50",
            )}
          >
            {Icon && (
              <span className={cn("mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl", checked ? "bg-primary text-primary-ink" : "bg-hover text-muted")}>
                <Icon className="h-4 w-4" aria-hidden />
              </span>
            )}
            <span className="min-w-0">
              <span className="block text-sm font-semibold">{choice.label}</span>
              {choice.description && <span className="mt-0.5 block text-xs text-muted">{choice.description}</span>}
            </span>
          </button>
        );
      })}
    </div>
  );
}
