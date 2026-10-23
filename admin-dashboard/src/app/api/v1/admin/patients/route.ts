import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth/middleware";
import { query } from "@/lib/db/client";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": process.env.WEBSITE_ORIGIN ?? "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export async function GET(request: Request) {
  const authErr = await requireAdmin(request);
  if (authErr) return authErr;

  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search");
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.max(1, Math.min(100, parseInt(searchParams.get("limit") || "20", 10)));
    const offset = (page - 1) * limit;

    const conditions: string[] = [];
    const params: unknown[] = [];

    if (search) {
      params.push(`%${search}%`);
      conditions.push(
        `(name ILIKE $${params.length} OR email ILIKE $${params.length} OR phone ILIKE $${params.length})`,
      );
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const countRes = await query<{ count: string }>(`SELECT count(*) as count FROM patients ${whereClause}`, params);
    const total = parseInt(countRes[0]?.count || "0", 10);

    const dataParams = [...params, limit, offset];
    const patients = await query(
      `SELECT * FROM patients ${whereClause} ORDER BY created_at DESC LIMIT $${dataParams.length - 1} OFFSET $${dataParams.length}`,
      dataParams,
    );

    return NextResponse.json({ data: patients, total, page, limit }, { headers: CORS_HEADERS });
  } catch (error) {
    console.error("[GET /api/v1/admin/patients]", error);
    return NextResponse.json({ error: "Failed to fetch patients" }, { status: 500, headers: CORS_HEADERS });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}
