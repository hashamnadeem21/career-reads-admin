import type { ComponentPropsWithoutRef, ElementType, ReactNode } from "react";
import { cn } from "@/lib/utils";

type GlassProps<T extends ElementType> = {
  as?: T;
  className?: string;
  children?: ReactNode;
} & Omit<ComponentPropsWithoutRef<T>, "as" | "className" | "children">;

/** Layer 2: the one large frosted frame holding sidebar + content. */
export function GlassShell<T extends ElementType = "div">({ as, className, ...props }: GlassProps<T>) {
  const Tag = (as ?? "div") as ElementType;
  return <Tag className={cn("glass-shell", className)} {...props} />;
}

/** Layer 3: a glass card. `strong` = ≥ 90% opaque for long text. */
export function GlassPanel<T extends ElementType = "section">({
  as,
  className,
  strong,
  ...props
}: GlassProps<T> & { strong?: boolean }) {
  const Tag = (as ?? "section") as ElementType;
  return <Tag className={cn(strong ? "glass-strong" : "glass", "p-5", className)} {...props} />;
}

/** Layer 4: a darker/lighter strip inside a panel. Never blurs. */
export function GlassInset<T extends ElementType = "div">({ as, className, ...props }: GlassProps<T>) {
  const Tag = (as ?? "div") as ElementType;
  return <Tag className={cn("glass-inset", className)} {...props} />;
}

export function PanelHeader({
  title,
  description,
  actions,
  id,
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  id?: string;
  className?: string;
}) {
  return (
    <div className={cn("mb-4 flex flex-wrap items-start justify-between gap-3", className)}>
      <div className="min-w-0">
        <h2 id={id} className="text-base font-semibold leading-tight">
          {title}
        </h2>
        {description && <p className="mt-1 text-[13px] text-muted">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function PageHeader({ title, description, actions }: { title: ReactNode; description?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        <h1 className="text-[28px] font-bold leading-tight tracking-tight">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
