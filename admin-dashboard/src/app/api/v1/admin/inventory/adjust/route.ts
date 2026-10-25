import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth/middleware";
import { adjustStock, type InventoryLogReason } from "@/lib/inventory-manager";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": process.env.WEBSITE_ORIGIN ?? "http://localhost:8080",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export async function POST(request: Request) {
  const authErr = await requireAdmin(request);
  if (authErr) return authErr;

  try {
    const body = await request.json();
    const { variantId, quantityChange, reason, notes } = body;

    if (!variantId || quantityChange === undefined || !reason) {
      return NextResponse.json(
        { error: "variantId, quantityChange, and reason are required" },
        { status: 400, headers: CORS_HEADERS },
      );
    }

    const change = parseInt(quantityChange, 10);
    if (isNaN(change)) {
      return NextResponse.json(
        { error: "quantityChange must be a valid integer" },
        { status: 400, headers: CORS_HEADERS },
      );
    }

    const result = await adjustStock({
      variantId,
      quantityChange: change,
      reason: reason as InventoryLogReason,
      notes,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400, headers: CORS_HEADERS });
    }

    return NextResponse.json(result, { headers: CORS_HEADERS });
  } catch (error) {
    console.error("[POST /api/v1/admin/inventory/adjust]", error);
    return NextResponse.json({ error: "Failed to adjust inventory" }, { status: 500, headers: CORS_HEADERS });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}
