import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth/middleware";
import { query } from "@/lib/db/client";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": process.env.WEBSITE_ORIGIN ?? "*",
  "Access-Control-Allow-Methods": "GET, PATCH, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const authErr = await requireAdmin(request);
  if (authErr) return authErr;

  try {
    const { id } = await params;
    const rows = await query("SELECT * FROM form_submissions WHERE id = $1", [id]);
    if (!rows[0]) {
      return NextResponse.json({ error: "Submission not found" }, { status: 404, headers: CORS_HEADERS });
    }
    return NextResponse.json(rows[0], { headers: CORS_HEADERS });
  } catch (error) {
    console.error("[GET /api/v1/admin/submissions/:id]", error);
    return NextResponse.json({ error: "Failed to fetch submission" }, { status: 500, headers: CORS_HEADERS });
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const authErr = await requireAdmin(request);
  if (authErr) return authErr;

  try {
    const { id } = await params;
    const body = await request.json();
    const { is_read, is_archived } = body;

    const updates: string[] = [];
    const values: unknown[] = [];

    if (is_read !== undefined) {
      values.push(is_read);
      updates.push(`is_read = $${values.length}`);
    }
    if (is_archived !== undefined) {
      values.push(is_archived);
      updates.push(`is_archived = $${values.length}`);
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400, headers: CORS_HEADERS });
    }

    values.push(id);
    const sql = `UPDATE form_submissions SET ${updates.join(", ")} WHERE id = $${values.length} RETURNING *`;
    const updated = await query(sql, values);

    if (!updated[0]) {
      return NextResponse.json({ error: "Submission not found" }, { status: 404, headers: CORS_HEADERS });
    }

    return NextResponse.json(updated[0], { headers: CORS_HEADERS });
  } catch (error) {
    console.error("[PATCH /api/v1/admin/submissions/:id]", error);
    return NextResponse.json({ error: "Failed to update submission" }, { status: 500, headers: CORS_HEADERS });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const authErr = await requireAdmin(request);
  if (authErr) return authErr;

  try {
    const { id } = await params;
    await query("DELETE FROM form_submissions WHERE id = $1", [id]);
    return NextResponse.json({ success: true }, { headers: CORS_HEADERS });
  } catch (error) {
    console.error("[DELETE /api/v1/admin/submissions/:id]", error);
    return NextResponse.json({ error: "Failed to delete submission" }, { status: 500, headers: CORS_HEADERS });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}
