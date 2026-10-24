import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth/middleware";
import { query } from "@/lib/db/client";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": process.env.WEBSITE_ORIGIN ?? "http://localhost:8080",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export async function GET(request: Request) {
  const authErr = await requireAdmin(request);
  if (authErr) return authErr;

  try {
    const [
      totalBookingsRes,
      pendingBookingsRes,
      subscribersRes,
      submissionsRes,
      productsRes,
      blogsRes,
      recentBookings,
    ] = await Promise.all([
      query<{ count: string }>("SELECT count(*) as count FROM bookings"),
      query<{ count: string }>("SELECT count(*) as count FROM bookings WHERE status = 'pending'"),
      query<{ count: string }>("SELECT count(*) as count FROM newsletter_subscribers"),
      query<{ count: string }>("SELECT count(*) as count FROM form_submissions"),
      query<{ count: string }>("SELECT count(*) as count FROM products WHERE published = true"),
      query<{ count: string }>("SELECT count(*) as count FROM blog_posts WHERE published = true"),
      query("SELECT * FROM bookings ORDER BY created_at DESC LIMIT 5"),
    ]);

    return NextResponse.json(
      {
        totalBookings: parseInt(totalBookingsRes[0]?.count || "0", 10),
        pendingBookings: parseInt(pendingBookingsRes[0]?.count || "0", 10),
        totalSubscribers: parseInt(subscribersRes[0]?.count || "0", 10),
        totalFormSubmissions: parseInt(submissionsRes[0]?.count || "0", 10),
        productsCount: parseInt(productsRes[0]?.count || "0", 10),
        blogPostsCount: parseInt(blogsRes[0]?.count || "0", 10),
        recentBookings,
      },
      { headers: CORS_HEADERS },
    );
  } catch (error) {
    console.error("[GET /api/v1/admin/analytics/overview]", error);
    return NextResponse.json({ error: "Failed to fetch overview analytics" }, { status: 500, headers: CORS_HEADERS });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}
