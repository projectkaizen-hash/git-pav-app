import { NextResponse } from "next/server";

import { query } from "@/lib/db/client";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": process.env.WEBSITE_ORIGIN ?? "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export async function GET() {
  try {
    const categories = await query(`
      SELECT c.id, c.name, c.slug, c.description, c.image_url, c.sort_order,
        parent.id as parent_id, parent.name as parent_name, parent.slug as parent_slug
      FROM categories c
      LEFT JOIN categories parent ON c.parent_id = parent.id
      WHERE c.is_active = true
      ORDER BY c.sort_order, c.name
    `);

    // Build tree structure
    const categoryMap = new Map();
    const rootCategories: any[] = [];

    categories.forEach((cat: any) => {
      categoryMap.set(cat.id, { ...cat, children: [] });
    });

    categories.forEach((cat: any) => {
      const category = categoryMap.get(cat.id);
      if (cat.parent_id && categoryMap.has(cat.parent_id)) {
        categoryMap.get(cat.parent_id).children.push(category);
      } else {
        rootCategories.push(category);
      }
    });

    return NextResponse.json(rootCategories, { headers: CORS_HEADERS });
  } catch (error) {
    console.error("[GET /api/v1/categories]", error);
    return NextResponse.json({ error: "Failed to fetch categories" }, { status: 500, headers: CORS_HEADERS });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}
