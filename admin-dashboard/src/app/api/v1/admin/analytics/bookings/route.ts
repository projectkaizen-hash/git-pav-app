import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth/middleware";
import { query } from "@/lib/db/client";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": process.env.WEBSITE_ORIGIN ?? "http://localhost:8080",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export async function GET(request: Request) {
  const authErr = await requireAdmin(request);
  if (authErr) return authErr;

  try {
    const [byStatus, byService, byDay] = await Promise.all([
      query<{ status: string; count: string }>("SELECT status, count(*) as count FROM bookings GROUP BY status"),
      query<{ service_type: string; count: string }>(
        "SELECT service_type, count(*) as count FROM bookings GROUP BY service_type ORDER BY count DESC LIMIT 10",
      ),
      query<{ date: string; count: string }>(
        `SELECT to_char(created_at, 'YYYY-MM-DD') as date, count(*) as count
         FROM bookings
         WHERE created_at >= now() - interval '30 days'
         GROUP BY to_char(created_at, 'YYYY-MM-DD')
         ORDER BY date ASC`,
      ),
    ]);

    return NextResponse.json(
      {
        byStatus: byStatus.map((r) => ({ status: r.status, count: parseInt(r.count, 10) })),
        byService: byService.map((r) => ({ service: r.service_type, count: parseInt(r.count, 10) })),
        byDay: byDay.map((r) => ({ date: r.date, count: parseInt(r.count, 10) })),
      },
      { headers: CORS_HEADERS },
    );
  } catch (error) {
    console.error("[GET /api/v1/admin/analytics/bookings]", error);
    return NextResponse.json({ error: "Failed to fetch bookings analytics" }, { status: 500, headers: CORS_HEADERS });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}
