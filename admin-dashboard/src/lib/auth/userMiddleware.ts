import { NextResponse } from "next/server";

import { verifyShopperToken } from "@/lib/auth/jwt";

/**
 * Protect public‑user API routes.
 * Looks for a JWT in the `Authorization: Bearer <token>` header **or** the `user_token` cookie.
 * Returns `void` on success or a 401 JSON response on failure.
 */
export async function requireUser(request: Request): Promise<NextResponse | void> {
  let token: string | null = null;

  // Header first
  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    token = authHeader.slice(7);
  }

  // Then cookie
  if (!token) {
    const cookieHeader = request.headers.get("cookie") ?? "";
    const match = cookieHeader.match(/(?:^|;\s*)user_token=([^;]+)/);
    if (match) token = decodeURIComponent(match[1]);
  }

  if (token && (await verifyShopperToken(token))) return;

  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
