import { NextResponse } from "next/server";

import { query } from "@/lib/db/client";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": process.env.WEBSITE_ORIGIN ?? "http://localhost:8080",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const category_id = searchParams.get("category_id");
    const category = searchParams.get("category");
    const search = searchParams.get("search")?.trim();
    const sort = searchParams.get("sort");
    const min_price = searchParams.get("min_price");
    const max_price = searchParams.get("max_price");

    let whereClause = "WHERE p.published = true";
    const params: any[] = [];
    let paramIdx = 0;

    if (category_id) {
      paramIdx++;
      whereClause += ` AND p.category_id = $${paramIdx}`;
      params.push(category_id);
    } else if (category && category !== "all") {
      paramIdx++;
      whereClause += ` AND (c.slug = $${paramIdx} OR p.category = $${paramIdx})`;
      params.push(category);
    }

    if (search) {
      paramIdx++;
      whereClause += ` AND (p.name ILIKE $${paramIdx} OR p.short_desc ILIKE $${paramIdx} OR p.full_desc ILIKE $${paramIdx})`;
      params.push(`%${search}%`);
    }

    if (min_price) {
      paramIdx++;
      whereClause += ` AND p.price >= $${paramIdx}`;
      params.push(parseFloat(min_price));
    }

    if (max_price) {
      paramIdx++;
      whereClause += ` AND p.price <= $${paramIdx}`;
      params.push(parseFloat(max_price));
    }

    let orderBy = "ORDER BY p.created_at DESC";
    if (sort === "price_asc" || sort === "price-low") {
      orderBy = "ORDER BY p.price ASC";
    } else if (sort === "price_desc" || sort === "price-high") {
      orderBy = "ORDER BY p.price DESC";
    } else if (sort === "rating") {
      orderBy = "ORDER BY p.rating DESC, p.reviews_count DESC";
    } else if (sort === "popular") {
      orderBy = "ORDER BY p.reviews_count DESC";
    }

    const products = await query(
      `
      SELECT
        p.*,
        c.name as category_name,
        c.slug as category_slug,
        (
          SELECT pi.url
          FROM product_images pi
          WHERE pi.product_id = p.id AND pi.is_primary = true
          LIMIT 1
        ) AS image,
        (
          SELECT COUNT(*) FROM product_variants pv WHERE pv.product_id = p.id AND pv.is_active = true
        ) as variant_count,
        (
          SELECT COALESCE(SUM(pv.stock_qty), 0) FROM product_variants pv WHERE pv.product_id = p.id AND pv.is_active = true
        ) as total_stock
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      ${whereClause}
      ${orderBy}
    `,
      params,
    );

    return NextResponse.json(products, { headers: CORS_HEADERS });
  } catch (error) {
    console.error("[GET /api/v1/products]", error);
    return NextResponse.json({ error: "Failed to fetch products" }, { status: 500, headers: CORS_HEADERS });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}
