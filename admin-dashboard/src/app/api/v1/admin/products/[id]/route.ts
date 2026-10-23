import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth/middleware";
import { query } from "@/lib/db/client";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": process.env.WEBSITE_ORIGIN ?? "*",
  "Access-Control-Allow-Methods": "GET, PATCH, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const authErr = await requireAdmin(request);
  if (authErr) return authErr;

  try {
    const { id } = await params;
    const products = await query("SELECT * FROM products WHERE id = $1", [id]);
    if (!products[0]) {
      return NextResponse.json({ error: "Product not found" }, { status: 404, headers: CORS_HEADERS });
    }
    const images = await query("SELECT * FROM product_images WHERE product_id = $1 ORDER BY sort_order ASC", [id]);
    return NextResponse.json({ ...products[0], images }, { headers: CORS_HEADERS });
  } catch (error) {
    console.error("[GET /api/v1/admin/products/:id]", error);
    return NextResponse.json({ error: "Failed to fetch product" }, { status: 500, headers: CORS_HEADERS });
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const authErr = await requireAdmin(request);
  if (authErr) return authErr;

  try {
    const { id } = await params;
    const body = await request.json();

    const allowedFields = [
      "name",
      "slug",
      "category",
      "category_label",
      "price",
      "original_price",
      "short_desc",
      "full_desc",
      "features",
      "how_to_use",
      "badge",
      "in_stock",
      "published",
    ];

    const updates: string[] = [];
    const values: unknown[] = [];

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        values.push(field === "features" ? JSON.stringify(body[field]) : body[field]);
        updates.push(`${field} = $${values.length}`);
      }
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400, headers: CORS_HEADERS });
    }

    values.push(new Date().toISOString());
    updates.push(`updated_at = $${values.length}`);

    values.push(id);
    const sql = `UPDATE products SET ${updates.join(", ")} WHERE id = $${values.length} RETURNING *`;
    const updated = await query(sql, values);

    if (!updated[0]) {
      return NextResponse.json({ error: "Product not found" }, { status: 404, headers: CORS_HEADERS });
    }

    if (body.image_url) {
      await query("DELETE FROM product_images WHERE product_id = $1", [id]);
      await query("INSERT INTO product_images (product_id, url, is_primary) VALUES ($1, $2, true)", [
        id,
        body.image_url,
      ]);
    }

    return NextResponse.json(updated[0], { headers: CORS_HEADERS });
  } catch (error) {
    console.error("[PATCH /api/v1/admin/products/:id]", error);
    return NextResponse.json({ error: "Failed to update product" }, { status: 500, headers: CORS_HEADERS });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const authErr = await requireAdmin(request);
  if (authErr) return authErr;

  try {
    const { id } = await params;
    await query("DELETE FROM products WHERE id = $1", [id]);
    return NextResponse.json({ success: true }, { headers: CORS_HEADERS });
  } catch (error) {
    console.error("[DELETE /api/v1/admin/products/:id]", error);
    return NextResponse.json({ error: "Failed to delete product" }, { status: 500, headers: CORS_HEADERS });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}
