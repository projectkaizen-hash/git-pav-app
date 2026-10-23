import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth/middleware";
import { query } from "@/lib/db/client";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": process.env.WEBSITE_ORIGIN ?? "*",
  "Access-Control-Allow-Methods": "GET, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const authErr = await requireAdmin(request);
  if (authErr) return authErr;

  try {
    const { id } = params;
    const categories = await query(
      `SELECT c.*,
        (SELECT COUNT(*) FROM products p WHERE p.category_id = c.id) as product_count,
        parent.name as parent_name
      FROM categories c
      LEFT JOIN categories parent ON c.parent_id = parent.id
      WHERE c.id = $1`,
      [id],
    );

    if (!categories.length) {
      return NextResponse.json({ error: "Category not found" }, { status: 404, headers: CORS_HEADERS });
    }

    return NextResponse.json(categories[0], { headers: CORS_HEADERS });
  } catch (error) {
    console.error("[GET /api/v1/admin/categories/[id]]", error);
    return NextResponse.json({ error: "Failed to fetch category" }, { status: 500, headers: CORS_HEADERS });
  }
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  const authErr = await requireAdmin(request);
  if (authErr) return authErr;

  try {
    const { id } = params;
    const body = await request.json();
    const { name, slug, parent_id, description, image_url, sort_order, is_active } = body;

    const result = await query(
      `UPDATE categories
       SET name = COALESCE($1, name),
           slug = COALESCE($2, slug),
           parent_id = COALESCE($3, parent_id),
           description = COALESCE($4, description),
           image_url = COALESCE($5, image_url),
           sort_order = COALESCE($6, sort_order),
           is_active = COALESCE($7, is_active),
           updated_at = NOW()
       WHERE id = $8
       RETURNING *`,
      [name, slug, parent_id || null, description, image_url, sort_order, is_active, id],
    );

    if (!result.length) {
      return NextResponse.json({ error: "Category not found" }, { status: 404, headers: CORS_HEADERS });
    }

    return NextResponse.json(result[0], { headers: CORS_HEADERS });
  } catch (error) {
    console.error("[PUT /api/v1/admin/categories/[id]]", error);
    return NextResponse.json({ error: "Failed to update category" }, { status: 500, headers: CORS_HEADERS });
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  const authErr = await requireAdmin(request);
  if (authErr) return authErr;

  try {
    const { id } = params;

    // Check if category has products
    const productCount = await query("SELECT COUNT(*) as count FROM products WHERE category_id = $1", [id]);

    if (Number(productCount[0].count) > 0) {
      return NextResponse.json(
        { error: "Cannot delete category with associated products" },
        { status: 400, headers: CORS_HEADERS },
      );
    }

    // Check if category has children
    const childCount = await query("SELECT COUNT(*) as count FROM categories WHERE parent_id = $1", [id]);

    if (Number(childCount[0].count) > 0) {
      return NextResponse.json(
        { error: "Cannot delete category with subcategories" },
        { status: 400, headers: CORS_HEADERS },
      );
    }

    await query("DELETE FROM categories WHERE id = $1", [id]);

    return NextResponse.json({ message: "Category deleted successfully" }, { headers: CORS_HEADERS });
  } catch (error) {
    console.error("[DELETE /api/v1/admin/categories/[id]]", error);
    return NextResponse.json({ error: "Failed to delete category" }, { status: 500, headers: CORS_HEADERS });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}
