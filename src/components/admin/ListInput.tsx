"use client";

import { ArrowDown, ArrowUp, Plus, X } from "lucide-react";
import { useId, useRef, useState } from "react";
import { Button } from "./Button";
import { Input } from "./Field";

/** Add / remove / reorder a list of short texts. Submits repeated inputs named `name`. */
export function ListInput({
  name,
  label,
  defaultValue = [],
  max = 20,
  placeholder,
  onChange,
  invalid,
}: {
  name: string;
  label: string;
  defaultValue?: string[];
  max?: number;
  placeholder?: string;
  onChange?: (items: string[]) => void;
  invalid?: boolean;
}) {
  const baseId = useId();
  const nextKey = useRef(defaultValue.length);
  const [items, setItems] = useState(() => defaultValue.map((text, i) => ({ key: i, text })));
  const listRef = useRef<HTMLOListElement>(null);

  const commit = (next: typeof items) => {
    setItems(next);
    onChange?.(next.map((i) => i.text));
  };

  const focusInput = (index: number) =>
    requestAnimationFrame(() => listRef.current?.querySelectorAll<HTMLInputElement>("input")[index]?.focus());

  const move = (index: number, by: -1 | 1) => {
    const target = index + by;
    if (target < 0 || target >= items.length) return;
    const next = [...items];
    [next[index], next[target]] = [next[target], next[index]];
    commit(next);
    focusInput(target);
  };

  return (
    <div className="flex flex-col gap-2">
      <ol ref={listRef} className="flex flex-col gap-2">
        {items.map((item, index) => (
          <li key={item.key} className="flex items-center gap-1.5">
            <span className="num w-5 shrink-0 text-right text-xs text-faint" aria-hidden>
              {index + 1}.
            </span>
            <Input
              id={`${baseId}-${item.key}`}
              name={name}
              value={item.text}
              invalid={invalid && item.text.trim().length > 0 && item.text.trim().length < 3}
              aria-label={`${label} ${index + 1}`}
              placeholder={placeholder}
              onChange={(e) => commit(items.map((it) => (it.key === item.key ? { ...it, text: e.target.value } : it)))}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  if (items.length < max) {
                    const next = [...items];
                    next.splice(index + 1, 0, { key: nextKey.current++, text: "" });
                    commit(next);
                    focusInput(index + 1);
                  }
                }
              }}
            />
            <Button variant="ghost" size="icon-sm" onClick={() => move(index, -1)} disabled={index === 0} aria-label={`Move ${label} ${index + 1} up`}>
              <ArrowUp />
            </Button>
            <Button variant="ghost" size="icon-sm" onClick={() => move(index, 1)} disabled={index === items.length - 1} aria-label={`Move ${label} ${index + 1} down`}>
              <ArrowDown />
            </Button>
            <Button variant="ghost" size="icon-sm" onClick={() => commit(items.filter((it) => it.key !== item.key))} aria-label={`Remove ${label} ${index + 1}`}>
              <X />
            </Button>
          </li>
        ))}
      </ol>
      <div>
        <Button
          size="sm"
          disabled={items.length >= max}
          onClick={() => {
            commit([...items, { key: nextKey.current++, text: "" }]);
            focusInput(items.length);
          }}
        >
          <Plus /> Add {label.toLowerCase()}
        </Button>
      </div>
    </div>
  );
}
