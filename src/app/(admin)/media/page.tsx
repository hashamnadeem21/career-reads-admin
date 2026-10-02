import type { Metadata } from "next";
import { PageHeader } from "@/components/admin/Glass";
import { MediaLibrary } from "@/components/media/MediaLibrary";
import { requireUser } from "@/lib/auth/require-user";
import { listMedia } from "@/lib/media/queries";

export const metadata: Metadata = { title: "Media" };

export default async function MediaPage({ searchParams }: PageProps<"/media">) {
  await requireUser();
  const [{ items, total }, sp] = await Promise.all([listMedia({}), searchParams]);
  return (
    <>
      <PageHeader title="Media" description="Upload images once and reuse them in posts. Click an image for alt text and where it's used." />
      <MediaLibrary initial={items} total={total} openUpload={sp.upload === "1"} />
    </>
  );
}
