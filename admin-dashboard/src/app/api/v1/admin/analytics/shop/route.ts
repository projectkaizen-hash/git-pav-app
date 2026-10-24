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
    const [topProducts, byCategory] = await Promise.all([
      query(
        "SELECT id, name, category, price, reviews_count, rating, in_stock FROM products WHERE published = true ORDER BY reviews_count DESC LIMIT 10",
      ),
      query<{ category: string; count: string }>(
        "SELECT category, count(*) as count FROM products WHERE published = true GROUP BY category",
      ),
    ]);

    return NextResponse.json(
      {
        topProducts,
        byCategory: byCategory.map((r) => ({ category: r.category, count: parseInt(r.count, 10) })),
      },
      { headers: CORS_HEADERS },
    );
  } catch (error) {
    console.error("[GET /api/v1/admin/analytics/shop]", error);
    return NextResponse.json({ error: "Failed to fetch shop analytics" }, { status: 500, headers: CORS_HEADERS });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}
