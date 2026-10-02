import { SearchX } from "lucide-react";
import Link from "next/link";
import { buttonClasses } from "@/components/admin/Button";
import { EmptyState } from "@/components/admin/EmptyState";

export default function NotFound() {
  return (
    <div className="flex min-h-dvh items-center justify-center p-4">
      <div className="glass w-full max-w-md p-6">
        <EmptyState
          icon={SearchX}
          title="Page not found"
          description="It may have been moved or deleted."
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
