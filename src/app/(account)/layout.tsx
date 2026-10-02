import { requireUser } from "@/lib/auth/require-user";

/** Pages a signed-in user can reach even before finishing setup (e.g. must change password). */
export default async function AccountLayout({ children }: LayoutProps<"/">) {
  await requireUser();
  return <main id="main" className="flex min-h-dvh items-center justify-center p-4">{children}</main>;
}
