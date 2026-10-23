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
    const category_id = searchParams.get("category_id");

    let whereClause = "";
    const params: any[] = [];

    if (category_id) {
      whereClause = "WHERE p.category_id = $1";
      params.push(category_id);
    }

    const products = await query(
      `
      SELECT p.*,
        (SELECT pi.url FROM product_images pi WHERE pi.product_id = p.id AND pi.is_primary = true LIMIT 1) as image,
        c.name as category_name,
        (SELECT COUNT(*) FROM product_variants pv WHERE pv.product_id = p.id AND pv.is_active = true) as variant_count,
        (SELECT COALESCE(SUM(pv.stock_qty), 0) FROM product_variants pv WHERE pv.product_id = p.id AND pv.is_active = true) as total_stock
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      ${whereClause}
      ORDER BY p.created_at DESC
    `,
      params,
    );

    return NextResponse.json(products, { headers: CORS_HEADERS });
  } catch (error) {
    console.error("[GET /api/v1/admin/products]", error);
    return NextResponse.json({ error: "Failed to fetch products" }, { status: 500, headers: CORS_HEADERS });
  }
}

export async function POST(request: Request) {
  const authErr = await requireAdmin(request);
  if (authErr) return authErr;

  try {
    const body = await request.json();
    const {
      name,
      slug,
      category_id,
      price,
      original_price,
      short_desc,
      full_desc,
      features = [],
      how_to_use,
      badge,
      in_stock = true,
      published = false,
      image_url,
    } = body;

    if (!name || !slug || !price) {
      return NextResponse.json({ error: "Name, slug, and price are required" }, { status: 400, headers: CORS_HEADERS });
    }

    const inserted = await query<Record<string, unknown>>(
      `INSERT INTO products (
        name, slug, category_id, price, original_price,
        short_desc, full_desc, features, how_to_use, badge, in_stock, published
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *`,
      [
        name,
        slug,
        category_id || null,
        price,
        original_price || null,
        short_desc || null,
        full_desc || null,
        JSON.stringify(features),
        how_to_use || null,
        badge || null,
        in_stock,
        published,
      ],
    );

    const product = inserted[0];

    if (image_url && product?.id) {
      await query(`INSERT INTO product_images (product_id, url, is_primary) VALUES ($1, $2, true)`, [
        product.id,
        image_url,
      ]);
    }

    return NextResponse.json(product, { status: 201, headers: CORS_HEADERS });
  } catch (error) {
    console.error("[POST /api/v1/admin/products]", error);
    return NextResponse.json({ error: "Failed to create product" }, { status: 500, headers: CORS_HEADERS });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}
