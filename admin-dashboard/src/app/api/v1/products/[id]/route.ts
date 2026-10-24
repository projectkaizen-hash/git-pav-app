import { NextResponse } from "next/server";

import { query } from "@/lib/db/client";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": process.env.WEBSITE_ORIGIN ?? "http://localhost:8080",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    const [product] = await query<any>(
      `SELECT p.*, c.name as category_name, c.slug as category_slug
       FROM products p
       LEFT JOIN categories c ON p.category_id = c.id
       WHERE p.id = $1 AND p.published = true`,
      [id],
    );

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404, headers: CORS_HEADERS });
    }

    const [images, variants, relatedProducts] = await Promise.all([
      query(`SELECT * FROM product_images WHERE product_id = $1 ORDER BY is_primary DESC, sort_order ASC`, [
        product.id,
      ]),
      query(
        `SELECT id, sku, attributes, price_override, stock_qty, is_active
         FROM product_variants
         WHERE product_id = $1 AND is_active = true
         ORDER BY created_at ASC`,
        [product.id],
      ),
      query(
        `SELECT p.id, p.name, p.slug, p.price, p.rating, p.reviews_count,
           (SELECT url FROM product_images WHERE product_id = p.id AND is_primary = true LIMIT 1) as image
         FROM products p
         WHERE p.published = true
           AND p.id != $1
           ${product.category_id ? "AND p.category_id = $2" : ""}
         ORDER BY p.reviews_count DESC
         LIMIT 4`,
        product.category_id ? [product.id, product.category_id] : [product.id],
      ),
    ]);

    return NextResponse.json(
      {
        ...product,
        images,
        variants,
        relatedProducts,
      },
      { headers: CORS_HEADERS },
    );
  } catch (error) {
    console.error("[GET /api/v1/products/[id]]", error);
    return NextResponse.json({ error: "Failed to fetch product" }, { status: 500, headers: CORS_HEADERS });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}