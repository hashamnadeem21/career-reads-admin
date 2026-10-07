import { apiResponse } from "@/lib/api/client";
import { requireStaff } from "@/lib/auth/require-user";

/** GET /api/export/subscribers → CSV download (staff only). The API builds the file. */
export async function GET() {
  await requireStaff();
  const upstream = await apiResponse("/subscribers/export.csv", { query: {} });
  return new Response(await upstream.text(), {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition":
        upstream.headers.get("content-disposition") ??
        `attachment; filename="blognest-subscribers-${new Date().toISOString().slice(0, 10)}.csv"`,
      "cache-control": "private, no-store",
    },
  });
}
