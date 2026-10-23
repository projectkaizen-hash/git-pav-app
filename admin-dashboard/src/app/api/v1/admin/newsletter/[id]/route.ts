import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth/middleware";
import { query } from "@/lib/db/client";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": process.env.WEBSITE_ORIGIN ?? "*",
  "Access-Control-Allow-Methods": "DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const authErr = await requireAdmin(request);
  if (authErr) return authErr;

  try {
    const { id } = await params;
    await query("DELETE FROM newsletter_subscribers WHERE id = $1", [id]);
    return NextResponse.json({ success: true }, { headers: CORS_HEADERS });
  } catch (error) {
    console.error("[DELETE /api/v1/admin/newsletter/:id]", error);
    return NextResponse.json({ error: "Failed to delete subscriber" }, { status: 500, headers: CORS_HEADERS });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}
