import { NextResponse } from "next/server";

import { verifyStaffToken } from "@/lib/auth/jwt";

/**
 * Call this at the top of any protected admin route.
 * Returns void on success, or a 401 NextResponse on failure. Only a staff
 * session from the dashboard sign-in passes: shopper, reset and verification
 * tokens share the signing secret and are refused, in every environment.
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

  if (token && (await verifyStaffToken(token))) return;

  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
