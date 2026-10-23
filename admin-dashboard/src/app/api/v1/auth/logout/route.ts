import { NextResponse } from "next/server";

import { signToken } from "@/lib/auth/jwt";
import { query } from "@/lib/db/client";

/**
 * POST /api/v1/auth/logout
 * Clears the `user_token` cookie.
 */
export async function POST() {
  const response = NextResponse.json({ message: "Logged out" }, { status: 200 });
  response.cookies.set("user_token", "", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
    expires: new Date(0), // expire immediately
  });
  return response;
}
