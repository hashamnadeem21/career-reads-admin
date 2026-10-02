"use client";

import { Checkbox as RadixCheckbox, Switch as RadixSwitch } from "radix-ui";
import { Check, ChevronDown } from "lucide-react";
import {
  forwardRef,
  useId,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";
import { cn } from "@/lib/utils";

/** Shared look for text-like controls: translucent fill, glass border, blue focus ring with glow. */
export const controlClasses = (invalid?: boolean) =>
  cn(
    "w-full rounded-[var(--radius-control)] border bg-inset px-3.5 text-sm text-ink placeholder:text-faint transition",
    "focus:border-link focus:outline-none focus-visible:shadow-[0_0_0_4px_var(--primary-glow)]",
    "disabled:cursor-not-allowed disabled:opacity-60",
    invalid ? "border-danger" : "border-glass-border",
  );

export function Field({
  label,
  htmlFor,
  hint,
  error,
  required,
  children,
  className,
  counter,
}: {
  label: ReactNode;
  htmlFor: string;
  hint?: ReactNode;
  error?: string | string[];
  required?: boolean;
  children: ReactNode;
  className?: string;
  counter?: { value: number; max: number; min?: number };
}) {
  const message = Array.isArray(error) ? error[0] : error;
  const over = counter && (counter.value > counter.max || (counter.min !== undefined && counter.value > 0 && counter.value < counter.min));
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <div className="flex items-baseline justify-between gap-2">
        <label htmlFor={htmlFor} className="text-[13px] font-medium text-muted">
          {label}
          {required && (
            <span className="text-danger" aria-hidden>
              {" "}
              *
            </span>
          )}
        </label>
        {counter && (
          <span className={cn("num text-xs", over ? "font-semibold text-danger" : "text-faint")} aria-live="polite">
            {counter.value}/{counter.max}
          </span>
        )}
      </div>
      {children}
      {message ? (
        <p id={`${htmlFor}-error`} className="text-xs font-medium text-danger" role="alert">
          {message}
        </p>
      ) : (
        hint && (
          <p id={`${htmlFor}-hint`} className="text-xs text-faint">
            {hint}
          </p>
        )
      )}
    </div>
  );
}

type InputProps = InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean };

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input({ className, invalid, ...props }, ref) {
  return (
    <input
      ref={ref}
      aria-invalid={invalid || undefined}
      aria-describedby={props.id ? (invalid ? `${props.id}-error` : `${props.id}-hint`) : undefined}
      className={cn(controlClasses(invalid), "h-10", className)}
      {...props}
    />
  );
});

type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean };

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea({ className, invalid, ...props }, ref) {
  return (
    <textarea
      ref={ref}
      aria-invalid={invalid || undefined}
      aria-describedby={props.id ? (invalid ? `${props.id}-error` : `${props.id}-hint`) : undefined}
      className={cn(controlClasses(invalid), "min-h-24 py-2.5 leading-relaxed", className)}
      {...props}
    />
  );
});

type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & { invalid?: boolean };

/** Native select (best keyboard + mobile support), styled as glass. */
export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select({ className, invalid, children, ...props }, ref) {
  return (
    <div className="relative">
      <select
        ref={ref}
        aria-invalid={invalid || undefined}
        className={cn(controlClasses(invalid), "h-10 appearance-none pr-9 [&>option]:bg-[var(--glass-solid-fallback)]", className)}
        {...props}
      >
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden />
    </div>
  );
});

export function Switch({
  label,
  description,
  name,
  checked,
  defaultChecked,
  onCheckedChange,
  disabled,
  id,
  className,
}: {
  label: ReactNode;
  description?: ReactNode;
  name?: string;
  checked?: boolean;
  defaultChecked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  disabled?: boolean;
  id?: string;
  className?: string;
}) {
  const autoId = useId();
  const switchId = id ?? autoId;
  return (
    <div className={cn("flex items-center justify-between gap-4", className)}>
      <label htmlFor={switchId} className="min-w-0 cursor-pointer">
        <span className="block text-sm font-medium">{label}</span>
        {description && <span className="block text-xs text-muted">{description}</span>}
      </label>
      <RadixSwitch.Root
        id={switchId}
        name={name}
        value="on"
        checked={checked}
        defaultChecked={defaultChecked}
        onCheckedChange={onCheckedChange}
        disabled={disabled}
        className="relative h-6 w-11 shrink-0 cursor-pointer rounded-full border border-glass-border bg-inset transition-colors data-[state=checked]:border-primary data-[state=checked]:bg-primary disabled:opacity-50"
      >
        <RadixSwitch.Thumb className="block h-5 w-5 translate-x-0.5 rounded-full bg-white shadow transition-transform data-[state=checked]:translate-x-[22px]" />
      </RadixSwitch.Root>
    </div>
  );
}

export function Checkbox({
  label,
  name,
  checked,
  defaultChecked,
  onCheckedChange,
  id,
  className,
  "aria-label": ariaLabel,
}: {
  label?: ReactNode;
  name?: string;
  checked?: boolean | "indeterminate";
  defaultChecked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  id?: string;
  className?: string;
  "aria-label"?: string;
}) {
  const autoId = useId();
  const boxId = id ?? autoId;
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <RadixCheckbox.Root
        id={boxId}
        name={name}
        value="on"
        checked={checked}
        defaultChecked={defaultChecked}
        onCheckedChange={(v) => onCheckedChange?.(v === true)}
        aria-label={ariaLabel}
        className="flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[5px] border border-glass-border bg-inset data-[state=checked]:border-primary data-[state=checked]:bg-primary data-[state=indeterminate]:border-primary data-[state=indeterminate]:bg-primary"
      >
        <RadixCheckbox.Indicator className="text-white">
          {checked === "indeterminate" ? <span className="block h-0.5 w-2 bg-white" /> : <Check className="h-3 w-3" strokeWidth={3} />}
        </RadixCheckbox.Indicator>
      </RadixCheckbox.Root>
      {label && (
        <label htmlFor={boxId} className="cursor-pointer text-sm">
          {label}
        </label>
      )}
    </span>
  );
}
