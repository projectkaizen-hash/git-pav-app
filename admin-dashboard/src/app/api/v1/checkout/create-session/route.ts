import { NextResponse } from "next/server";

import Stripe from "stripe";

import { requireUser } from "@/lib/auth/userMiddleware";
import { query } from "@/lib/db/client";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "sk_test_placeholder_key", {
  apiVersion: "2026-08-26.dahlia",
});

/**
 * POST /api/v1/checkout/create-session
 * Body: { items: [{ productId: string, quantity: number }] }
 * Returns: { sessionId: string }
 */
export async function POST(req: Request) {
  // Protect route
  const authError = await requireUser(req);
  if (authError) return authError;

  const { items } = await req.json();
  if (!Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: "Cart is empty" }, { status: 400 });
  }

  // Resolve product data
  const productIds = items.map((i: any) => i.productId);
  const placeholders = productIds.map((_, idx) => `$${idx + 1}`).join(",");
  const products = await query<any>(
    `SELECT id, name, price FROM products WHERE id = ANY(ARRAY[${placeholders}]::uuid[]) AND published = true`,
    productIds,
  );

  const lineItems = items.map((item: any) => {
    const prod = products.find((p) => p.id === item.productId);
    if (!prod) throw new Error("Product not found");
    return {
      price_data: {
        currency: "usd",
        product_data: { name: prod.name },
        unit_amount: Math.round(parseFloat(prod.price) * 100), // cents
      },
      quantity: item.quantity,
    } as Stripe.Checkout.SessionCreateParams.LineItem;
  });

  // Create a pending order record first
  const total = lineItems.reduce((sum, li) => sum + (li.price_data?.unit_amount ?? 0) * (li.quantity ?? 0), 0) / 100;
  const userPayload = await requireUser(req);
  // At this point requireUser already validated and returned void, but we need user id.
  // We'll decode token again to get userId.
  const authHeader = req.headers.get("authorization") ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : undefined;
  const cookieHeader = req.headers.get("cookie") ?? "";
  const match = token ? undefined : cookieHeader.match(/(?:^|;\s*)user_token=([^;]+)/);
  const rawToken = token || (match ? decodeURIComponent(match[1]) : null);
  if (!rawToken) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  const { verifyToken } = await import("@/lib/auth/jwt");
  const payload = await verifyToken(rawToken);
  const userId = payload?.userId;
  if (!userId) return NextResponse.json({ error: "Invalid token" }, { status: 401 });

  const insertRes = await query<any>(`INSERT INTO orders (user_id, status, total) VALUES ($1, $2, $3) RETURNING id`, [
    userId,
    "pending",
    total,
  ]);
  const orderId = insertRes[0].id;

  // Insert order_items
  for (const item of items) {
    const prod = products.find((p) => p.id === item.productId);
    await query<any>(`INSERT INTO order_items (order_id, product_id, quantity, unit_price) VALUES ($1, $2, $3, $4)`, [
      orderId,
      prod.id,
      item.quantity,
      prod.price,
    ]);
  }

  // Create Stripe Checkout Session
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    line_items: lineItems,
    mode: "payment",
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/order/{CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/cart`,
    metadata: { orderId },
  });

  // Update order with Stripe session id
  await query<any>(`UPDATE orders SET stripe_session_id = $1 WHERE id = $2`, [session.id, orderId]);

  return NextResponse.json({ sessionId: session.id }, { status: 200 });
}
