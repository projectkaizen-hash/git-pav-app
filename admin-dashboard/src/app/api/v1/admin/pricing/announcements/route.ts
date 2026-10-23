import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth/middleware";
import { query } from "@/lib/db/client";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": process.env.WEBSITE_ORIGIN ?? "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export async function GET(request: Request) {
  const authErr = await requireAdmin(request);
  if (authErr) return authErr;

  try {
    const rows = await query("SELECT * FROM announcements ORDER BY created_at DESC");
    return NextResponse.json(rows, { headers: CORS_HEADERS });
  } catch (error) {
    console.error("[GET /api/v1/admin/pricing/announcements]", error);
    return NextResponse.json({ error: "Failed to fetch announcements" }, { status: 500, headers: CORS_HEADERS });
  }
}

export async function POST(request: Request) {
  const authErr = await requireAdmin(request);
  if (authErr) return authErr;

  try {
    const body = await request.json();
    const { title, body: text, cta_text, cta_url, is_active = true } = body;

    if (!text) {
      return NextResponse.json({ error: "Body text is required" }, { status: 400, headers: CORS_HEADERS });
    }

    const inserted = await query(
      "INSERT INTO announcements (title, body, cta_text, cta_url, is_active) VALUES ($1, $2, $3, $4, $5) RETURNING *",
      [title || null, text, cta_text || null, cta_url || null, is_active],
    );

    return NextResponse.json(inserted[0], { status: 201, headers: CORS_HEADERS });
  } catch (error) {
    console.error("[POST /api/v1/admin/pricing/announcements]", error);
    return NextResponse.json({ error: "Failed to create announcement" }, { status: 500, headers: CORS_HEADERS });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}
