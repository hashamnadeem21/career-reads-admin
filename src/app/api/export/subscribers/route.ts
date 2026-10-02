import { asc } from "drizzle-orm";
import { getDb } from "@/db";
import { subscribers } from "@/db/schema";
import { requireUser } from "@/lib/auth/require-user";

/** Neutralises spreadsheet formulas (CSV injection) and quotes every field. */
function csvField(value: string): string {
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return `"${safe.replace(/"/g, '""')}"`;
}

/** GET /api/export/subscribers → CSV download (signed-in users only). */
export async function GET() {
  await requireUser();
  const rows = await getDb().select().from(subscribers).orderBy(asc(subscribers.createdAt));
  const lines = [
    ["email", "confirmed", "subscribed_at"].join(","),
    ...rows.map((r) => [csvField(r.email), r.confirmed ? "yes" : "no", r.createdAt.toISOString()].join(",")),
  ];
  return new Response(`${lines.join("\n")}\n`, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="blognest-subscribers-${new Date().toISOString().slice(0, 10)}.csv"`,
      "cache-control": "private, no-store",
    },
  });
}
