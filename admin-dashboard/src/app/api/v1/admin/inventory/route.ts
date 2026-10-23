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
    const filter = searchParams.get("filter"); // 'low_stock', 'out_of_stock', 'in_stock'
    const search = searchParams.get("search")?.trim();
    const limit = parseInt(searchParams.get("limit") || "50");

    let whereClause = "WHERE pv.is_active = true";
    const params: any[] = [];
    let paramIdx = 0;

    if (filter === "low_stock") {
      whereClause += " AND pv.stock_qty > 0 AND pv.stock_qty <= 10";
    } else if (filter === "out_of_stock") {
      whereClause += " AND pv.stock_qty = 0";
    } else if (filter === "in_stock") {
      whereClause += " AND pv.stock_qty > 10";
    }

    if (search) {
      paramIdx++;
      whereClause += ` AND (p.name ILIKE $${paramIdx} OR pv.sku ILIKE $${paramIdx})`;
      params.push(`%${search}%`);
    }

    const inventory = await query(
      `
      SELECT 
        pv.id as variant_id,
        pv.sku,
        pv.attributes,
        pv.stock_qty,
        pv.price_override,
        pv.is_active,
        p.id as product_id,
        p.name as product_name,
        p.slug as product_slug,
        p.price as base_price,
        (
          SELECT url FROM product_images pi 
          WHERE pi.product_id = p.id AND pi.is_primary = true 
          LIMIT 1
        ) as image
      FROM product_variants pv
      JOIN products p ON pv.product_id = p.id
      ${whereClause}
      ORDER BY pv.stock_qty ASC, p.name ASC
      LIMIT $${paramIdx + 1}
    `,
      [...params, limit],
    );

    // Also get overall counts
    const [stats] = await query<any>(`
      SELECT 
        COUNT(*) as total_variants,
        COUNT(*) FILTER (WHERE stock_qty > 10) as in_stock,
        COUNT(*) FILTER (WHERE stock_qty > 0 AND stock_qty <= 10) as low_stock,
        COUNT(*) FILTER (WHERE stock_qty = 0) as out_of_stock,
        COALESCE(SUM(stock_qty), 0) as total_units
      FROM product_variants
      WHERE is_active = true
    `);

    return NextResponse.json(
      {
        inventory,
        stats: {
          totalVariants: parseInt(stats.total_variants),
          inStock: parseInt(stats.in_stock),
          lowStock: parseInt(stats.low_stock),
          outOfStock: parseInt(stats.out_of_stock),
          totalUnits: parseInt(stats.total_units),
        },
      },
      { headers: CORS_HEADERS },
    );
  } catch (error) {
    console.error("[GET /api/v1/admin/inventory]", error);
    return NextResponse.json({ error: "Failed to fetch inventory" }, { status: 500, headers: CORS_HEADERS });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}
