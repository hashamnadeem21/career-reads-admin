import { apiResponse } from "@/lib/api/client";
import { requireSuperAdmin } from "@/lib/auth/require-user";
import { parseCandidateListParams } from "@/lib/candidates/queries";

/** GET /api/export/candidates?q&method&subscribed&from&to → CSV (super admins only). The API builds the file. */
export async function GET(request: Request) {
  await requireSuperAdmin();
  const filters = parseCandidateListParams(Object.fromEntries(new URL(request.url).searchParams));
  const upstream = await apiResponse("/candidates/export", { query: { ...filters, page: undefined } });
  // Bytes, not text(): text() would drop the BOM that makes Excel read the file as UTF-8.
  return new Response(await upstream.arrayBuffer(), {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition":
        upstream.headers.get("content-disposition") ?? `attachment; filename="candidates-${new Date().toISOString().slice(0, 10)}.csv"`,
      "cache-control": "private, no-store",
    },
  });
}
