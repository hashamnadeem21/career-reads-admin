import { ApiError, apiResponse } from "@/lib/api/client";
import { requireUser } from "@/lib/auth/require-user";

/**
 * GET /api/applications/:id/cv[?download=true] → the CV, passed through from the API (which checks
 * that this user may see the application and records that it was opened). Never cached.
 */
export async function GET(request: Request, { params }: RouteContext<"/api/applications/[id]/cv">) {
  await requireUser();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return new Response("Not found", { status: 404 });
  const download = new URL(request.url).searchParams.get("download") === "true";
  try {
    const upstream = await apiResponse(`/applications/${id}/cv`, { query: { download: download ? "true" : undefined } });
    const headers = new Headers({ "cache-control": "private, no-store", "x-content-type-options": "nosniff" });
    for (const name of ["content-type", "content-length", "content-disposition"]) {
      const value = upstream.headers.get(name);
      if (value) headers.set(name, value);
    }
    return new Response(upstream.body, { headers });
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return new Response("This CV is no longer available.", { status: 404 });
    throw error;
  }
}
