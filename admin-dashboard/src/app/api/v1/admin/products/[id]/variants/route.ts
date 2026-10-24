import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth/middleware";
import { query } from "@/lib/db/client";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": process.env.WEBSITE_ORIGIN ?? "http://localhost:8080",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> | { id: string } }) {
  const authErr = await requireAdmin(request);
  if (authErr) return authErr;

  try {
    const { id } = await Promise.resolve(params);
    const variants = await query(`SELECT * FROM product_variants WHERE product_id = $1 ORDER BY created_at`, [id]);

    return NextResponse.json(variants, { headers: CORS_HEADERS });
  } catch (error) {
    console.error("[GET /api/v1/admin/products/[id]/variants]", error);
    return NextResponse.json({ error: "Failed to fetch variants" }, { status: 500, headers: CORS_HEADERS });
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> | { id: string } }) {
  const authErr = await requireAdmin(request);
  if (authErr) return authErr;

  try {
    const { id } = await Promise.resolve(params);
    const body = await request.json();
    const { sku, attributes, price_override, stock_qty = 0, is_active = true } = body;

    if (!sku || !attributes) {
      return NextResponse.json({ error: "SKU and attributes are required" }, { status: 400, headers: CORS_HEADERS });
    }

    // Check if SKU already exists
    const existing = await query("SELECT id FROM product_variants WHERE sku = $1", [sku]);
    if (existing.length > 0) {
      return NextResponse.json({ error: "SKU already exists" }, { status: 409, headers: CORS_HEADERS });
    }

    const result = await query(
      `INSERT INTO product_variants (product_id, sku, attributes, price_override, stock_qty, is_active)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [id, sku, JSON.stringify(attributes), price_override || null, stock_qty, is_active],
    );

    return NextResponse.json(result[0], { status: 201, headers: CORS_HEADERS });
  } catch (error) {
    console.error("[POST /api/v1/admin/products/[id]/variants]", error);
    return NextResponse.json({ error: "Failed to create variant" }, { status: 500, headers: CORS_HEADERS });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}
