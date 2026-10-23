import { NextResponse } from "next/server";

import bcrypt from "bcryptjs";

import { signToken } from "@/lib/auth/jwt";
import { query } from "@/lib/db/client";
import { sendVerificationEmail } from "@/lib/email"; // placeholder, implement as needed

/**
 * POST /api/v1/auth/register
 * Body: { email, password, name?, phone? }
 */
export async function POST(req: Request) {
  try {
    const { email, password, name = "", phone = "" } = await req.json();
    if (!email || !password) {
      return NextResponse.json({ error: "Email and password required" }, { status: 400 });
    }

    // Check if user already exists
    const existing = await query<any>("SELECT id FROM users WHERE email = $1", [email]);
    if (existing.length) {
      return NextResponse.json({ error: "User already exists" }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const result = await query<any>(
      `INSERT INTO users (email, password_hash, name, phone, email_verified)
       VALUES ($1, $2, $3, $4, true) RETURNING id, email, name, phone, email_verified`,
      [email, passwordHash, name, phone],
    );
    const user = result[0];

    // Issue JWT token for immediate login
    const token = await signToken({ userId: user.id, purpose: "auth" }, 60 * 60 * 24 * 7); // 7 days
    const response = NextResponse.json({ message: "User registered successfully", token }, { status: 201 });
    response.cookies.set("user_token", token, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 7,
    });
    return response;
  } catch (err) {
    console.error("Register error", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
