import { NextResponse } from "next/server";

import { query } from "@/lib/db/client";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": process.env.WEBSITE_ORIGIN ?? "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export async function GET() {
  try {
    const announcements = await query(`
      SELECT * FROM announcements
      WHERE is_active = true
      ORDER BY created_at DESC
    `);

    return NextResponse.json(announcements, { headers: CORS_HEADERS });
  } catch (error) {
    console.error("[GET /api/v1/announcements]", error);
    return NextResponse.json({ error: "Failed to fetch announcements" }, { status: 500, headers: CORS_HEADERS });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}
