import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth/middleware";
import { query } from "@/lib/db/client";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": process.env.WEBSITE_ORIGIN ?? "http://localhost:8080",
  "Access-Control-Allow-Methods": "GET, PATCH, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const authErr = await requireAdmin(request);
  if (authErr) return authErr;

  try {
    const { id } = await params;
    const methods = await query("SELECT * FROM shipping_methods WHERE id = $1", [id]);
    if (!methods[0]) {
      return NextResponse.json({ error: "Shipping method not found" }, { status: 404, headers: CORS_HEADERS });
    }
    return NextResponse.json(methods[0], { headers: CORS_HEADERS });
  } catch (error) {
    console.error("[GET /api/v1/admin/shipping/:id]", error);
    return NextResponse.json({ error: "Failed to fetch shipping method" }, { status: 500, headers: CORS_HEADERS });
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const authErr = await requireAdmin(request);
  if (authErr) return authErr;

  try {
    const { id } = await params;
    const body = await request.json();

    const allowedFields = [
      "name",
      "description",
      "base_price",
      "free_shipping_threshold",
      "estimated_days",
      "is_active",
      "sort_order",
    ];

    const updates: string[] = [];
    const values: unknown[] = [];

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        values.push(body[field]);
        updates.push(`${field} = $${values.length}`);
      }
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400, headers: CORS_HEADERS });
    }

    // Get old values for audit log
    const oldRecord = await query("SELECT * FROM shipping_methods WHERE id = $1", [id]);
    if (!oldRecord[0]) {
      return NextResponse.json({ error: "Shipping method not found" }, { status: 404, headers: CORS_HEADERS });
    }

    values.push(id);
    const sql = `UPDATE shipping_methods SET ${updates.join(", ")} WHERE id = $${values.length} RETURNING *`;
    const updated = await query(sql, values);

    // Log the action
    await query(
      `INSERT INTO audit_logs (action, entity_type, entity_id, old_values, new_values, user_id, ip_address, user_agent)
       VALUES ('shipping_updated', 'shipping', $1, $2, $3, $4, $5, $6)`,
      [
        id,
        JSON.stringify(oldRecord[0]),
        JSON.stringify(updated[0]),
        null,
        request.headers.get("x-forwarded-for"),
        request.headers.get("user-agent"),
      ],
    );

    return NextResponse.json(updated[0], { headers: CORS_HEADERS });
  } catch (error) {
    console.error("[PATCH /api/v1/admin/shipping/:id]", error);
    return NextResponse.json({ error: "Failed to update shipping method" }, { status: 500, headers: CORS_HEADERS });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const authErr = await requireAdmin(request);
  if (authErr) return authErr;

  try {
    const { id } = await params;

    // Get old values for audit log
    const oldRecord = await query("SELECT * FROM shipping_methods WHERE id = $1", [id]);
    if (!oldRecord[0]) {
      return NextResponse.json({ error: "Shipping method not found" }, { status: 404, headers: CORS_HEADERS });
    }

    await query("DELETE FROM shipping_methods WHERE id = $1", [id]);

    // Log the action
    await query(
      `INSERT INTO audit_logs (action, entity_type, entity_id, old_values, user_id, ip_address, user_agent)
       VALUES ('shipping_deleted', 'shipping', $1, $2, $3, $4, $5)`,
      [
        id,
        JSON.stringify(oldRecord[0]),
        null,
        request.headers.get("x-forwarded-for"),
        request.headers.get("user-agent"),
      ],
    );

    return NextResponse.json({ success: true }, { headers: CORS_HEADERS });
  } catch (error) {
    console.error("[DELETE /api/v1/admin/shipping/:id]", error);
    return NextResponse.json({ error: "Failed to delete shipping method" }, { status: 500, headers: CORS_HEADERS });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}
