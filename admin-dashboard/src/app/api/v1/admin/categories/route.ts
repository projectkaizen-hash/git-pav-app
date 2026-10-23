import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth/middleware";
import { query } from "@/lib/db/client";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": process.env.WEBSITE_ORIGIN ?? "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export async function GET(request: Request) {
  const authErr = await requireAdmin(request);
  if (authErr) return authErr;

  try {
    const categories = await query(`
      SELECT c.*,
        (SELECT COUNT(*) FROM products p WHERE p.category_id = c.id) as product_count,
        parent.name as parent_name
      FROM categories c
      LEFT JOIN categories parent ON c.parent_id = parent.id
      ORDER BY c.sort_order, c.name
    `);
    return NextResponse.json(categories, { headers: CORS_HEADERS });
  } catch (error) {
    console.error("[GET /api/v1/admin/categories]", error);
    return NextResponse.json({ error: "Failed to fetch categories" }, { status: 500, headers: CORS_HEADERS });
  }
}

export async function POST(request: Request) {
  const authErr = await requireAdmin(request);
  if (authErr) return authErr;

  try {
    const body = await request.json();
    const { name, slug, parent_id, description, image_url, sort_order = 0, is_active = true } = body;

    if (!name || !slug) {
      return NextResponse.json({ error: "Name and slug are required" }, { status: 400, headers: CORS_HEADERS });
    }

    const result = await query(
      `INSERT INTO categories (name, slug, parent_id, description, image_url, sort_order, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [name, slug, parent_id || null, description || null, image_url || null, sort_order, is_active],
    );

    return NextResponse.json(result[0], { status: 201, headers: CORS_HEADERS });
  } catch (error) {
    console.error("[POST /api/v1/admin/categories]", error);
    return NextResponse.json({ error: "Failed to create category" }, { status: 500, headers: CORS_HEADERS });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}
