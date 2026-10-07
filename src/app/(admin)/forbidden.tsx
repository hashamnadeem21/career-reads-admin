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
        title="You don't have access to this page"
        description="Your account doesn't include this page. Ask a Career Reads admin if you think you need it."
        action={
          <Link href="/" className={buttonClasses({ variant: "primary" })}>
            Back to dashboard
          </Link>
        }
      />
    </GlassPanel>
  );
}
