import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth/middleware";
import { query } from "@/lib/db/client";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": process.env.WEBSITE_ORIGIN ?? "http://localhost:8080",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export async function GET(request: Request) {
  const authErr = await requireAdmin(request);
  if (authErr) return authErr;

  try {
    const { searchParams } = new URL(request.url);
    const is_active = searchParams.get("is_active");

    let whereClause = "";
    const params: any[] = [];

    if (is_active !== null) {
      whereClause = "WHERE is_active = $1";
      params.push(is_active === "true");
    }

    const discounts = await query(
      `
      SELECT *,
        CASE 
          WHEN valid_until < now() THEN 'expired'
          WHEN valid_from > now() THEN 'upcoming'
          ELSE 'active'
        END as current_status
      FROM discounts
      ${whereClause}
      ORDER BY created_at DESC
    `,
      params,
    );

    return NextResponse.json(discounts, { headers: CORS_HEADERS });
  } catch (error) {
    console.error("[GET /api/v1/admin/discounts]", error);
    return NextResponse.json({ error: "Failed to fetch discounts" }, { status: 500, headers: CORS_HEADERS });
  }
}

export async function POST(request: Request) {
  const authErr = await requireAdmin(request);
  if (authErr) return authErr;

  try {
    const body = await request.json();
    const { code, type, value, min_order_value, max_uses, valid_from, valid_until, is_active = true } = body;

    if (!code || !type || !value) {
      return NextResponse.json({ error: "Code, type, and value are required" }, { status: 400, headers: CORS_HEADERS });
    }

    if (type !== "percentage" && type !== "fixed_amount") {
      return NextResponse.json(
        { error: "Type must be percentage or fixed_amount" },
        { status: 400, headers: CORS_HEADERS },
      );
    }

    const result = await query(
      `INSERT INTO discounts (code, type, value, min_order_value, max_uses, valid_from, valid_until, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        code.toUpperCase(),
        type,
        value,
        min_order_value || null,
        max_uses || null,
        valid_from || new Date().toISOString(),
        valid_until || null,
        is_active,
      ],
    );

    // Log the action
    await query(
      `INSERT INTO audit_logs (action, entity_type, entity_id, new_values, user_id, ip_address, user_agent)
       VALUES ('discount_created', 'discount', $1, $2, $3, $4, $5)`,
      [
        result[0].id,
        JSON.stringify(result[0]),
        null,
        request.headers.get("x-forwarded-for"),
        request.headers.get("user-agent"),
      ],
    );

    return NextResponse.json(result[0], { status: 201, headers: CORS_HEADERS });
  } catch (error) {
    console.error("[POST /api/v1/admin/discounts]", error);
    return NextResponse.json({ error: "Failed to create discount" }, { status: 500, headers: CORS_HEADERS });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}
