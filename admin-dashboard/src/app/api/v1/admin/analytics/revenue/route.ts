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
    // 1. Overall KPIs from real orders
    const [kpiResult] = await query<any>(`
      SELECT 
        COALESCE(SUM(total) FILTER (WHERE status IN ('paid', 'fulfilling', 'shipped', 'delivered')), 0) as total_revenue,
        COUNT(*) FILTER (WHERE status IN ('paid', 'fulfilling', 'shipped', 'delivered')) as total_orders,
        COUNT(*) FILTER (WHERE status = 'pending') as pending_orders,
        COALESCE(AVG(total) FILTER (WHERE status IN ('paid', 'fulfilling', 'shipped', 'delivered')), 0) as aov,
        COUNT(DISTINCT customer_email) FILTER (WHERE customer_email IS NOT NULL) as total_customers
      FROM orders
    `);

    // 2. Revenue by day (last 30 days)
    const dailyRevenue = await query<any>(`
      SELECT 
        to_char(date_trunc('day', created_at), 'YYYY-MM-DD') as date,
        COALESCE(SUM(total), 0) as revenue,
        COUNT(*) as orders_count
      FROM orders
      WHERE status IN ('paid', 'fulfilling', 'shipped', 'delivered')
        AND created_at >= now() - interval '30 days'
      GROUP BY date_trunc('day', created_at)
      ORDER BY date_trunc('day', created_at) ASC
    `);

    return NextResponse.json(
      {
        kpis: {
          totalRevenue: parseFloat(kpiResult.total_revenue),
          totalOrders: parseInt(kpiResult.total_orders, 10),
          pendingOrders: parseInt(kpiResult.pending_orders, 10),
          averageOrderValue: Math.round(parseFloat(kpiResult.aov) * 100) / 100,
          totalCustomers: parseInt(kpiResult.total_customers, 10),
        },
        dailyRevenue: dailyRevenue.map((d: any) => ({
          date: d.date,
          revenue: parseFloat(d.revenue),
          orders: parseInt(d.orders_count, 10),
        })),
      },
      { headers: CORS_HEADERS },
    );
  } catch (error) {
    console.error("[GET /api/v1/admin/analytics/revenue]", error);
    return NextResponse.json({ error: "Failed to fetch revenue analytics" }, { status: 500, headers: CORS_HEADERS });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}
