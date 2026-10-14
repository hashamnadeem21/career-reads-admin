import { apiResponse } from "@/lib/api/client";
import { requireUser } from "@/lib/auth/require-user";

/** GET /api/export/applications[?job=slug] → CSV of the applications this user may see. The API builds the file. */
export async function GET(request: Request) {
  await requireUser();
  const job = new URL(request.url).searchParams.get("job")?.slice(0, 120) || undefined;
  const upstream = await apiResponse("/applications/export", { query: { job } });
  return new Response(await upstream.text(), {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition":
        upstream.headers.get("content-disposition") ?? `attachment; filename="applications-${new Date().toISOString().slice(0, 10)}.csv"`,
      "cache-control": "private, no-store",
    },
  });
}
