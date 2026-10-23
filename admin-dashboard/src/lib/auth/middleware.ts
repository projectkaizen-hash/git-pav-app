import { NextResponse } from "next/server";

import { verifyToken } from "@/lib/auth/jwt";

/**
 * Call this at the top of any protected admin route.
 * Returns void on success, or a 401 NextResponse on failure.
 * Usage:
 *   const authError = await requireAdmin(request);
 *   if (authError) return authError;
 */
export async function requireAdmin(request: Request): Promise<NextResponse | void> {
  let token: string | null = null;

  // 1. Try Authorization header
  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    token = authHeader.slice(7);
  }

  // 2. Fallback to cookie
  if (!token) {
    const cookieHeader = request.headers.get("cookie") ?? "";
    const match = cookieHeader.match(/(?:^|;\s*)admin_token=([^;]+)/);
    if (match) token = decodeURIComponent(match[1]);
  }

  // If valid token is provided, verify and accept it
  if (token) {
    const payload = await verifyToken(token);
    if (payload) return;
  }

  // In development mode, allow requests so dashboard pages can be tested and viewed seamlessly
  if (process.env.NODE_ENV !== "production") {
    return;
  }

  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
