import { NextResponse } from "next/server";

import { signToken } from "@/lib/auth/jwt";
import { query } from "@/lib/db/client";
import { sendPasswordResetEmail } from "@/lib/email";

/**
 * POST /api/v1/auth/reset-request
 * Body: { email }
 * Sends a password‑reset email with a short‑lived token.
 */
export async function POST(req: Request) {
  try {
    const { email } = await req.json();
    if (!email) return NextResponse.json({ error: "Email required" }, { status: 400 });

    // Find user
    const rows = await query<any>("SELECT id FROM users WHERE email = $1", [email]);
    if (!rows.length) {
      // Do not reveal existence – respond success anyway
      return NextResponse.json({ message: "If that email exists, a reset link was sent" }, { status: 200 });
    }
    const userId = rows[0].id;
    const token = await signToken({ userId, purpose: "password_reset" }, 60 * 60); // 1h
    await sendPasswordResetEmail(email, token);
    return NextResponse.json({ message: "If that email exists, a reset link was sent" }, { status: 200 });
  } catch (err) {
    console.error("Reset request error", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
