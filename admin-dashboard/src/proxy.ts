import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { verifyStaffToken } from "@/lib/auth/jwt";

const ALLOWED_ORIGINS = [process.env.WEBSITE_ORIGIN ?? "http://localhost:8080", "http://localhost:3001"];

function corsHeaders(origin: string | null) {
  const allowed = origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };
}

/**
 * Global edge proxy for the Admin Dashboard.
 *
 * - Handles CORS preflight (OPTIONS) for all /api/* routes.
 * - Allows all API routes (`/api/*`) – they already enforce auth via
 *   `requireAdmin` / `requireUser`.
 * - Allows the authentication UI (`/auth/*`).
 * - For any other UI route (e.g. `/dashboard/*`, `/`), checks the
 *   `admin_token` cookie holds a staff session. If not, redirects to the
 *   login page.
 */
export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const origin = req.headers.get("origin");

  // Handle CORS preflight for API routes
  if (req.method === "OPTIONS" && pathname.startsWith("/api")) {
    return new NextResponse(null, {
      status: 204,
      headers: corsHeaders(origin),
    });
  }

  // Attach CORS headers to all API responses
  if (pathname.startsWith("/api")) {
    const response = NextResponse.next();
    const headers = corsHeaders(origin);
    Object.entries(headers).forEach(([key, value]) => {
      response.headers.set(key, value);
    });
    return response;
  }

  // Permit auth pages and Next.js internals
  if (pathname.startsWith("/auth") || pathname.startsWith("/_next") || pathname === "/favicon.ico") {
    return NextResponse.next();
  }

  // Protect all other UI routes – require a staff session in admin_token
  const token = req.cookies.get("admin_token")?.value;
  if (!token || !(await verifyStaffToken(token))) {
    const loginUrl = req.nextUrl.clone();
    loginUrl.pathname = "/auth/v1/login";
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
