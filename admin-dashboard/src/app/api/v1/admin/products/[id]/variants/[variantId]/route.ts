import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth/middleware";
import { query } from "@/lib/db/client";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": process.env.WEBSITE_ORIGIN ?? "*",
  "Access-Control-Allow-Methods": "GET, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string; variantId: string }> | { id: string; variantId: string } },
) {
  const authErr = await requireAdmin(request);
  if (authErr) return authErr;

  try {
    const { variantId } = await Promise.resolve(params);
    const body = await request.json();
    const { sku, attributes, price_override, stock_qty, is_active } = body;

    // Check if SKU already exists (excluding current variant)
    if (sku) {
      const existing = await query("SELECT id FROM product_variants WHERE sku = $1 AND id != $2", [sku, variantId]);
      if (existing.length > 0) {
        return NextResponse.json({ error: "SKU already exists" }, { status: 409, headers: CORS_HEADERS });
      }
    }

    const result = await query(
      `UPDATE product_variants
       SET sku = COALESCE($1, sku),
           attributes = COALESCE($2, attributes),
           price_override = COALESCE($3, price_override),
           stock_qty = COALESCE($4, stock_qty),
           is_active = COALESCE($5, is_active),
           updated_at = NOW()
       WHERE id = $6
       RETURNING *`,
      [sku, attributes ? JSON.stringify(attributes) : null, price_override, stock_qty, is_active, variantId],
    );

    if (!result.length) {
      return NextResponse.json({ error: "Variant not found" }, { status: 404, headers: CORS_HEADERS });
    }

    return NextResponse.json(result[0], { headers: CORS_HEADERS });
  } catch (error) {
    console.error("[PUT /api/v1/admin/products/[id]/variants/[variantId]]", error);
    return NextResponse.json({ error: "Failed to update variant" }, { status: 500, headers: CORS_HEADERS });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; variantId: string }> | { id: string; variantId: string } },
) {
  const authErr = await requireAdmin(request);
  if (authErr) return authErr;

  try {
    const { variantId } = await Promise.resolve(params);

    // Check if variant is in any orders
    const orderCount = await query("SELECT COUNT(*) as count FROM order_items WHERE variant_id = $1", [variantId]);

    if (Number(orderCount[0].count) > 0) {
      return NextResponse.json(
        { error: "Cannot delete variant that has been ordered" },
        { status: 400, headers: CORS_HEADERS },
      );
    }

    await query("DELETE FROM product_variants WHERE id = $1", [variantId]);

    return NextResponse.json({ message: "Variant deleted successfully" }, { headers: CORS_HEADERS });
  } catch (error) {
    console.error("[DELETE /api/v1/admin/products/[id]/variants/[variantId]]", error);
    return NextResponse.json({ error: "Failed to delete variant" }, { status: 500, headers: CORS_HEADERS });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}
