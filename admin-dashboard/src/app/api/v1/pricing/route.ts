import { NextResponse } from "next/server";

import { query } from "@/lib/db/client";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": process.env.WEBSITE_ORIGIN ?? "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export async function GET() {
  try {
    const [plans, rawCategories, announcements] = await Promise.all([
      query(`
        SELECT * FROM pricing_plans ORDER BY sort_order ASC
      `),
      query(`
        SELECT
          fc.id AS category_id,
          fc.name AS category,
          fi.id,
          fi.name,
          fi.fee,
          fi.sort_order
        FROM fee_categories fc
        LEFT JOIN fee_items fi ON fi.category_id = fc.id
        ORDER BY fc.sort_order ASC, fi.sort_order ASC
      `),
      query(`
        SELECT * FROM announcements WHERE is_active = true ORDER BY created_at DESC
      `),
    ]);

    // Shape fee schedule into grouped format
    const feeMap = new Map<
      string,
      { id: string; name: string; category: string; items: Array<{ id: unknown; name: unknown; fee: unknown }> }
    >();
    for (const row of rawCategories) {
      const catId = row.category_id as string;
      if (!feeMap.has(catId)) {
        feeMap.set(catId, {
          id: catId,
          name: (row.category as string) || "",
          category: (row.category as string) || "",
          items: [],
        });
      }
      if (row.id) {
        feeMap.get(catId)!.items.push({
          id: row.id,
          name: row.name,
          fee: row.fee,
        });
      }
    }
    const feeSchedule = Array.from(feeMap.values());

    return NextResponse.json({ plans, feeSchedule, announcements }, { headers: CORS_HEADERS });
  } catch (error) {
    console.error("[GET /api/v1/pricing]", error);
    return NextResponse.json({ error: "Failed to fetch pricing data" }, { status: 500, headers: CORS_HEADERS });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}
