import { NextResponse } from "next/server";

import { query } from "@/lib/db/client";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": process.env.WEBSITE_ORIGIN ?? "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const is_active = searchParams.get("is_active");

    let whereClause = "";
    const params: any[] = [];

    if (is_active !== null) {
      whereClause = "WHERE is_active = $1";
      params.push(is_active === "true");
    }

    const shippingMethods = await query(
      `
      SELECT * FROM shipping_methods
      ${whereClause}
      ORDER BY sort_order ASC, base_price ASC
    `,
      params,
    );

    return NextResponse.json(shippingMethods, { headers: CORS_HEADERS });
  } catch (error) {
    console.error("[GET /api/v1/shipping]", error);
    return NextResponse.json({ error: "Failed to fetch shipping methods" }, { status: 500, headers: CORS_HEADERS });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}
