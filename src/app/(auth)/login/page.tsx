import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/auth/LoginForm";
import { Logo } from "@/components/admin/Logo";
import { ThemeSwitch } from "@/components/admin/ThemeSwitch";
import { getCurrentUser } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  if (await getCurrentUser()) redirect("/");
  const { next } = await searchParams;
  return (
    <main id="main" className="relative flex min-h-dvh items-center justify-center p-4">
      <div className="glass absolute right-4 top-4 rounded-full p-1">
        <ThemeSwitch signedIn={false} compact />
      </div>
      <div className="glass rise-in w-full max-w-[400px] p-7 sm:p-8">
        <Logo />
        <h1 className="mt-7 text-2xl font-bold tracking-tight">Welcome back</h1>
        <p className="mb-6 mt-1 text-sm text-muted">Sign in to manage posts, jobs and settings.</p>
        <LoginForm next={typeof next === "string" ? next : undefined} />
      </div>
    </main>
  );
}
