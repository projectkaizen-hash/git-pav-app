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
    const categories = await query<{ id: string; name: string; sort_order: number }>(
      "SELECT * FROM fee_categories ORDER BY sort_order ASC, created_at ASC",
    );
    const items = await query<{ id: string; category_id: string; name: string; fee: string; sort_order: number }>(
      "SELECT * FROM fee_items ORDER BY sort_order ASC, created_at ASC",
    );

    const result = categories.map((cat) => ({
      ...cat,
      items: items.filter((item) => item.category_id === cat.id),
    }));

    return NextResponse.json(result, { headers: CORS_HEADERS });
  } catch (error) {
    console.error("[GET /api/v1/admin/pricing/fee]", error);
    return NextResponse.json({ error: "Failed to fetch fee schedule" }, { status: 500, headers: CORS_HEADERS });
  }
}

export async function POST(request: Request) {
  const authErr = await requireAdmin(request);
  if (authErr) return authErr;

  try {
    const body = await request.json();
    const { category_id, name, fee, sort_order = 0 } = body;

    if (!category_id || !name || !fee) {
      return NextResponse.json(
        { error: "category_id, name, and fee are required" },
        { status: 400, headers: CORS_HEADERS },
      );
    }

    const inserted = await query(
      "INSERT INTO fee_items (category_id, name, fee, sort_order) VALUES ($1, $2, $3, $4) RETURNING *",
      [category_id, name, fee, sort_order],
    );

    return NextResponse.json(inserted[0], { status: 201, headers: CORS_HEADERS });
  } catch (error) {
    console.error("[POST /api/v1/admin/pricing/fee]", error);
    return NextResponse.json({ error: "Failed to create fee item" }, { status: 500, headers: CORS_HEADERS });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}
