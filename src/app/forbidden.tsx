import { ShieldAlert } from "lucide-react";
import Link from "next/link";
import { buttonClasses } from "@/components/admin/Button";
import { EmptyState } from "@/components/admin/EmptyState";

export default function Forbidden() {
  return (
    <div className="flex min-h-dvh items-center justify-center p-4">
      <div className="glass w-full max-w-md p-6">
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
      </div>
    </div>
  );
}
