import { NextResponse } from "next/server";

import bcrypt from "bcryptjs";

import { signToken } from "@/lib/auth/jwt";
import { query } from "@/lib/db/client";

/**
 * POST /api/v1/auth/login
 * Body: { email, password }
 * Sets `user_token` cookie on success.
 */
export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();
    if (!email || !password) {
      return NextResponse.json({ error: "Email and password required" }, { status: 400 });
    }

    const rows = await query<any>("SELECT id, password_hash, email_verified FROM users WHERE email = $1", [email]);
    if (!rows.length) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }
    const user = rows[0];
    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }
    if (!user.email_verified) {
      return NextResponse.json({ error: "Email not verified" }, { status: 403 });
    }

    const token = await signToken({ userId: user.id, purpose: "auth" }, 60 * 60 * 24 * 7); // 7 days
    const response = NextResponse.json({ message: "Logged in", token }, { status: 200 });
    // httpOnly cookie, SameSite Lax, secure in prod
    response.cookies.set("user_token", token, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 7,
    });
    return response;
  } catch (err) {
    console.error("Login error", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
