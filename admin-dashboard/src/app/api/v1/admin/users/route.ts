import { NextResponse } from "next/server";

import { query } from "@/lib/db/client";

/**
 * GET /api/v1/admin/users
 * Returns all users from the database
 */
export async function GET() {
  try {
    const users = await query<any>(
      "SELECT id, email, name, phone, email_verified, created_at, updated_at FROM users ORDER BY created_at DESC",
    );

    return NextResponse.json({ users }, { status: 200 });
  } catch (err) {
    console.error("Error fetching users:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
