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
    const plans = await query("SELECT * FROM pricing_plans ORDER BY sort_order ASC, created_at ASC");
    return NextResponse.json(plans, { headers: CORS_HEADERS });
  } catch (error) {
    console.error("[GET /api/v1/admin/pricing/plans]", error);
    return NextResponse.json({ error: "Failed to fetch pricing plans" }, { status: 500, headers: CORS_HEADERS });
  }
}

export async function POST(request: Request) {
  const authErr = await requireAdmin(request);
  if (authErr) return authErr;

  try {
    const body = await request.json();
    const {
      name,
      color = "bronze",
      monthly_price,
      yearly_price,
      features = [],
      is_popular = false,
      badge,
      sort_order = 0,
    } = body;

    if (!name || monthly_price === undefined || yearly_price === undefined) {
      return NextResponse.json(
        { error: "Name, monthly_price, and yearly_price are required" },
        { status: 400, headers: CORS_HEADERS },
      );
    }

    const inserted = await query<Record<string, unknown>>(
      `INSERT INTO pricing_plans (name, color, monthly_price, yearly_price, features, is_popular, badge, sort_order)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [name, color, monthly_price, yearly_price, JSON.stringify(features), is_popular, badge || null, sort_order],
    );

    return NextResponse.json(inserted[0], { status: 201, headers: CORS_HEADERS });
  } catch (error) {
    console.error("[POST /api/v1/admin/pricing/plans]", error);
    return NextResponse.json({ error: "Failed to create pricing plan" }, { status: 500, headers: CORS_HEADERS });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}
