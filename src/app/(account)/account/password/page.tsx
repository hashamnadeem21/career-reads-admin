import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { ChangePasswordForm } from "@/components/auth/ChangePasswordForm";
import { Logo } from "@/components/admin/Logo";
import { requireUser } from "@/lib/auth/require-user";

export const metadata: Metadata = { title: "Change password" };

export default async function ChangePasswordPage() {
  const user = await requireUser();
  return (
    <div className="glass rise-in w-full max-w-[420px] p-7 sm:p-8">
      <Logo />
      <h1 className="mt-7 text-2xl font-bold tracking-tight">{user.mustChangePassword ? "Choose your password" : "Change password"}</h1>
      <p className="mb-6 mt-1 text-sm text-muted">
        {user.mustChangePassword
          ? "You signed in with a temporary password. Pick a new one to continue."
          : "Changing your password signs you out on other devices."}
      </p>
      <ChangePasswordForm />
      {!user.mustChangePassword && (
        <Link href="/" className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline">
          <ArrowLeft className="h-4 w-4" /> Back to dashboard
        </Link>
      )}
    </div>
  );
}
