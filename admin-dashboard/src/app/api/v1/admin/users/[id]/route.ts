import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth/middleware";
import { query } from "@/lib/db/client";

/**
 * DELETE /api/v1/admin/users/[id]
 * Delete a user by ID
 */
export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const authErr = await requireAdmin(req);
  if (authErr) return authErr;

  try {
    const { id } = params;

    await query("DELETE FROM users WHERE id = $1", [id]);

    return NextResponse.json({ message: "User deleted successfully" }, { status: 200 });
  } catch (err) {
    console.error("Error deleting user:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * PUT /api/v1/admin/users/[id]
 * Update a user by ID
 */
export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const authErr = await requireAdmin(req);
  if (authErr) return authErr;

  try {
    const { id } = params;
    const { name, phone, email_verified } = await req.json();

    const result = await query(
      "UPDATE users SET name = $1, phone = $2, email_verified = $3, updated_at = NOW() WHERE id = $4 RETURNING *",
      [name, phone, email_verified, id],
    );

    if (!result.length) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ user: result[0] }, { status: 200 });
  } catch (err) {
    console.error("Error updating user:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
