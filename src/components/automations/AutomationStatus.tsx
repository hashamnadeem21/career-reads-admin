import { Badge } from "@/components/admin/Badge";

/** Active = green, Off = grey. */
export function AutomationStatus({ active, className }: { active: boolean; className?: string }) {
  return (
    <Badge tone={active ? "success" : "neutral"} dot className={className}>
      {active ? "Active" : "Off"}
    </Badge>
  );
}
