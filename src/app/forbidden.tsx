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
        title="Admins only"
        description="Your role doesn't include this page. Ask an admin if you need access."
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
