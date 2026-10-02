import { and, eq, gt } from "drizzle-orm";
import type { Metadata } from "next";
import Link from "next/link";
import { AcceptInviteForm } from "@/components/auth/AcceptInviteForm";
import { Badge } from "@/components/admin/Badge";
import { Logo } from "@/components/admin/Logo";
import { getDb } from "@/db";
import { invites } from "@/db/schema";
import { hashToken } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Accept invite" };

export default async function InvitePage({ params }: PageProps<"/invite/[token]">) {
  const { token } = await params;
  const [invite] =
    token.length >= 20 && token.length <= 100
      ? await getDb()
          .select()
          .from(invites)
          .where(and(eq(invites.tokenHash, hashToken(token)), gt(invites.expiresAt, new Date())))
          .limit(1)
      : [];
  return (
    <main id="main" className="flex min-h-dvh items-center justify-center p-4">
      <div className="glass rise-in w-full max-w-[420px] p-7 sm:p-8">
        <Logo />
        {invite ? (
          <>
            <h1 className="mt-7 text-2xl font-bold tracking-tight">You&apos;re invited</h1>
            <p className="mb-6 mt-1 text-sm text-muted">
              Join as <Badge tone={invite.role === "admin" ? "info" : "warning"} className="capitalize">{invite.role}</Badge> with {invite.email}.
            </p>
            <AcceptInviteForm token={token} name={invite.name} />
          </>
        ) : (
          <>
            <h1 className="mt-7 text-2xl font-bold tracking-tight">This invite isn&apos;t valid</h1>
            <p className="mt-2 text-sm text-muted">It may have expired or already been used. Ask an admin for a new link.</p>
            <Link href="/login" className="mt-6 inline-block text-sm font-semibold text-link hover:underline">
              Go to sign in
            </Link>
          </>
        )}
      </div>
    </main>
  );
}
