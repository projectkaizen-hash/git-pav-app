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
    const form_type = searchParams.get("form_type");
    const is_read = searchParams.get("is_read");
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.max(1, Math.min(100, parseInt(searchParams.get("limit") || "20", 10)));
    const offset = (page - 1) * limit;

    const conditions: string[] = ["is_archived = false"];
    const params: unknown[] = [];

    if (form_type && form_type !== "all") {
      params.push(form_type);
      conditions.push(`form_type = $${params.length}`);
    }

    if (is_read !== null && is_read !== undefined && is_read !== "") {
      params.push(is_read === "true");
      conditions.push(`is_read = $${params.length}`);
    }

    const whereClause = `WHERE ${conditions.join(" AND ")}`;

    const countRes = await query<{ count: string }>(
      `SELECT count(*) as count FROM form_submissions ${whereClause}`,
      params,
    );
    const total = parseInt(countRes[0]?.count || "0", 10);

    const dataParams = [...params, limit, offset];
    const submissions = await query(
      `SELECT * FROM form_submissions ${whereClause} ORDER BY submitted_at DESC LIMIT $${dataParams.length - 1} OFFSET $${dataParams.length}`,
      dataParams,
    );

    return NextResponse.json({ data: submissions, total, page, limit }, { headers: CORS_HEADERS });
  } catch (error) {
    console.error("[GET /api/v1/admin/submissions]", error);
    return NextResponse.json({ error: "Failed to fetch form submissions" }, { status: 500, headers: CORS_HEADERS });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}
