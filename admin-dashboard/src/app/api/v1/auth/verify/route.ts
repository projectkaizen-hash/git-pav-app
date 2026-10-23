import { NextResponse } from "next/server";

import { signToken, verifyToken } from "@/lib/auth/jwt";
import { query } from "@/lib/db/client";
import { sendVerificationEmail } from "@/lib/email";

/**
 * POST /api/v1/auth/verify
 * Body: { token }
 * Marks the user's email as verified.
 */
export async function POST(req: Request) {
  try {
    const { token } = await req.json();
    if (!token) return NextResponse.json({ error: "Token required" }, { status: 400 });

    const payload = await verifyToken(token);
    if (!payload || payload.purpose !== "email_verification") {
      return NextResponse.json({ error: "Invalid or expired token" }, { status: 400 });
    }
    const userId = payload.userId;
    await query("UPDATE users SET email_verified = true WHERE id = $1", [userId]);
    return NextResponse.json({ message: "Email verified" }, { status: 200 });
  } catch (err) {
    console.error("Verify error", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
