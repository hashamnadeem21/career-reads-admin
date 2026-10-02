"use client";

import { X } from "lucide-react";
import { useState, type KeyboardEvent } from "react";
import { cn } from "@/lib/utils";
import { controlClasses } from "./Field";

/** Type a tag and press Enter or comma. Submits as repeated hidden inputs named `name`. */
export function TagInput({
  id,
  name,
  defaultValue = [],
  max = 8,
  invalid,
  placeholder = "Add a tag and press Enter",
  onChange,
}: {
  id: string;
  name: string;
  defaultValue?: string[];
  max?: number;
  invalid?: boolean;
  placeholder?: string;
  onChange?: (tags: string[]) => void;
}) {
  const [tags, setTags] = useState(defaultValue);
  const [draft, setDraft] = useState("");

  const update = (next: string[]) => {
    setTags(next);
    onChange?.(next);
  };

  const commit = () => {
    const value = draft.trim().toLowerCase().replace(/,/g, "");
    if (value && !tags.includes(value) && tags.length < max) update([...tags, value]);
    setDraft("");
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      commit();
    } else if (e.key === "Backspace" && !draft && tags.length) {
      update(tags.slice(0, -1));
    }
  };

  return (
    <div className={cn(controlClasses(invalid), "flex min-h-10 flex-wrap items-center gap-1.5 py-1.5 focus-within:border-primary")}>
      {tags.map((tag) => (
        <span key={tag} className="inline-flex items-center gap-1 rounded-full bg-primary-soft py-0.5 pl-2.5 pr-1 text-xs font-semibold text-primary">
          {tag}
          <button
            type="button"
            onClick={() => update(tags.filter((t) => t !== tag))}
            className="rounded-full p-0.5 hover:bg-primary/20"
            aria-label={`Remove tag ${tag}`}
          >
            <X className="h-3 w-3" />
          </button>
          <input type="hidden" name={name} value={tag} />
        </span>
      ))}
      <input
        id={id}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={onKeyDown}
        onBlur={commit}
        placeholder={tags.length >= max ? `Up to ${max} tags` : placeholder}
        disabled={tags.length >= max}
        aria-invalid={invalid || undefined}
        className="min-w-28 flex-1 bg-transparent text-sm outline-none placeholder:text-faint focus-visible:shadow-none focus-visible:outline-none"
      />
    </div>
  );
}
