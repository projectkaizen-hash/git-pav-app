import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth/middleware";
import { query } from "@/lib/db/client";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": process.env.WEBSITE_ORIGIN ?? "*",
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

    const shippingMethods = await query(
      `
      SELECT * FROM shipping_methods
      ${whereClause}
      ORDER BY sort_order, name
    `,
      params,
    );

    return NextResponse.json(shippingMethods, { headers: CORS_HEADERS });
  } catch (error) {
    console.error("[GET /api/v1/admin/shipping]", error);
    return NextResponse.json({ error: "Failed to fetch shipping methods" }, { status: 500, headers: CORS_HEADERS });
  }
}

export async function POST(request: Request) {
  const authErr = await requireAdmin(request);
  if (authErr) return authErr;

  try {
    const body = await request.json();
    const {
      name,
      description,
      base_price,
      free_shipping_threshold,
      estimated_days,
      is_active = true,
      sort_order = 0,
    } = body;

    if (!name || !base_price) {
      return NextResponse.json({ error: "Name and base price are required" }, { status: 400, headers: CORS_HEADERS });
    }

    const result = await query(
      `INSERT INTO shipping_methods (name, description, base_price, free_shipping_threshold, estimated_days, is_active, sort_order)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        name,
        description || null,
        base_price,
        free_shipping_threshold || null,
        estimated_days || null,
        is_active,
        sort_order,
      ],
    );

    // Log the action
    await query(
      `INSERT INTO audit_logs (action, entity_type, entity_id, new_values, user_id, ip_address, user_agent)
       VALUES ('shipping_created', 'shipping', $1, $2, $3, $4, $5)`,
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
    console.error("[POST /api/v1/admin/shipping]", error);
    return NextResponse.json({ error: "Failed to create shipping method" }, { status: 500, headers: CORS_HEADERS });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}
