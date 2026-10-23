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
    const products = await query(`
      SELECT 
        p.id,
        p.name,
        p.slug,
        p.price,
        (
          SELECT url FROM product_images WHERE product_id = p.id AND is_primary = true LIMIT 1
        ) as image,
        COALESCE(SUM(oi.quantity), 0) as units_sold,
        COALESCE(SUM(oi.quantity * oi.unit_price), 0) as total_sales,
        (
          SELECT COALESCE(SUM(pv.stock_qty), 0) FROM product_variants pv WHERE pv.product_id = p.id AND pv.is_active = true
        ) as stock_remaining
      FROM products p
      LEFT JOIN order_items oi ON oi.product_id = p.id
      LEFT JOIN orders o ON oi.order_id = o.id AND o.status IN ('paid', 'fulfilling', 'shipped', 'delivered')
      WHERE p.published = true
      GROUP BY p.id
      ORDER BY total_sales DESC, units_sold DESC
      LIMIT 10
    `);

    return NextResponse.json(
      products.map((p: any) => ({
        id: p.id,
        name: p.name,
        slug: p.slug,
        price: parseFloat(p.price),
        image: p.image || "https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=200&q=80",
        unitsSold: parseInt(p.units_sold, 10),
        totalSales: parseFloat(p.total_sales),
        stockRemaining: parseInt(p.stock_remaining, 10),
      })),
      { headers: CORS_HEADERS },
    );
  } catch (error) {
    console.error("[GET /api/v1/admin/analytics/products]", error);
    return NextResponse.json({ error: "Failed to fetch product analytics" }, { status: 500, headers: CORS_HEADERS });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}
