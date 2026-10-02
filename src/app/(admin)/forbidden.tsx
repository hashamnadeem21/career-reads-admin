import { ShieldAlert } from "lucide-react";
import Link from "next/link";
import { buttonClasses } from "@/components/admin/Button";
import { EmptyState } from "@/components/admin/EmptyState";
import { GlassPanel } from "@/components/admin/Glass";

export default function Forbidden() {
  return (
    <GlassPanel>
      <EmptyState
        icon={ShieldAlert}
        title="Admins only"
        description="Your role doesn't include this page. Ask an admin if you need access."
        action={
          <Link href="/" className={buttonClasses({ variant: "primary" })}>
            Back to dashboard
          </Link>
        }
      />
    </GlassPanel>
  );
}
