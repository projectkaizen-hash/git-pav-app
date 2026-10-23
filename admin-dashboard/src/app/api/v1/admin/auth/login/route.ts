import { NextResponse } from "next/server";

import { signToken } from "@/lib/auth/jwt";

import crypto from "node:crypto";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": process.env.WEBSITE_ORIGIN ?? "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400, headers: CORS_HEADERS });
    }

    const expectedEmail = process.env.ADMIN_EMAIL || "admin@pavdental.com";
    const expectedPassword = process.env.ADMIN_PASSWORD || "admin123";
    const expectedHash = process.env.ADMIN_PASSWORD_HASH;

    let isValid = false;
    if (email === expectedEmail) {
      if (expectedHash) {
        const salt = process.env.ADMIN_SALT || "";
        const hash = crypto
          .createHash("sha256")
          .update(password + salt)
          .digest("hex");
        isValid = hash === expectedHash;
      } else {
        isValid = password === expectedPassword;
      }
    }

    if (!isValid) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401, headers: CORS_HEADERS });
    }

    // 24 hours expiry
    const token = await signToken({ email, role: "admin" }, 60 * 60 * 24);

    const response = NextResponse.json({ success: true, token }, { headers: CORS_HEADERS });

    response.cookies.set("admin_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24,
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("[POST /api/v1/admin/auth/login]", error);
    return NextResponse.json({ error: "Authentication failed" }, { status: 500, headers: CORS_HEADERS });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}
