"use client";

import { useRouter } from "next/navigation";
import { useOptimistic, useTransition } from "react";
import { toast } from "sonner";
import { setAutomationActive } from "@/app/actions/automations";
import { Switch } from "@/components/admin/Field";

/**
 * Switches an automation on or off (super admins). `beforeChange` can save pending edits first and
 * return false to cancel.
 */
export function ActiveSwitch({
  id,
  active,
  disabled,
  beforeChange,
  className,
}: {
  id: number;
  active: boolean;
  disabled?: boolean;
  beforeChange?: () => Promise<boolean>;
  className?: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [shown, setShown] = useOptimistic(active);

  return (
    <Switch
      className={className}
      label={shown ? "On" : "Off"}
      checked={shown}
      disabled={disabled || pending}
      onCheckedChange={(next) =>
        start(async () => {
          if (beforeChange && !(await beforeChange())) return;
          setShown(next);
          const result = await setAutomationActive(id, next);
          (result.ok ? toast.success : toast.error)(result.errors?.body ?? result.message);
          router.refresh();
        })
      }
    />
  );
}
