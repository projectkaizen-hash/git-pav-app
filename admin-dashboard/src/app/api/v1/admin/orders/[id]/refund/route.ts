import { NextResponse } from "next/server";

import Stripe from "stripe";

import { requireAdmin } from "@/lib/auth/middleware";
import { query } from "@/lib/db/client";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": process.env.WEBSITE_ORIGIN ?? "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "sk_test_mock_pavdental_key", {
  apiVersion: "2026-08-26.dahlia" as any,
});

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> | { id: string } }) {
  const authErr = await requireAdmin(request);
  if (authErr) return authErr;

  try {
    const { id } = await Promise.resolve(params);
    const body = await request.json().catch(() => ({}));
    const { reason, restockItems = true, refundAmount } = body;

    const [order] = await query<any>("SELECT * FROM orders WHERE id = $1", [id]);
    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404, headers: CORS_HEADERS });
    }

    if (order.status === "refunded") {
      return NextResponse.json({ error: "Order is already refunded" }, { status: 400, headers: CORS_HEADERS });
    }

    const payments = await query<any>(
      "SELECT * FROM payments WHERE order_id = $1 AND status = 'succeeded' ORDER BY created_at DESC",
      [id],
    );

    // If Stripe payment exists, issue refund via Stripe API
    let stripeRefundId: string | null = null;
    if (
      payments.length > 0 &&
      payments[0].stripe_payment_intent_id &&
      !payments[0].stripe_payment_intent_id.startsWith("mock_")
    ) {
      try {
        const refundParams: Stripe.RefundCreateParams = {
          payment_intent: payments[0].stripe_payment_intent_id,
          reason: "requested_by_customer",
        };
        if (refundAmount) {
          refundParams.amount = Math.round(parseFloat(refundAmount) * 100);
        }
        const stripeRefund = await stripe.refunds.create(refundParams);
        stripeRefundId = stripeRefund.id;
      } catch (stripeErr: any) {
        console.error("[Stripe Refund Error]", stripeErr.message);
      }
    }

    // Update order status to refunded
    const [updatedOrder] = await query<any>(
      "UPDATE orders SET status = 'refunded', updated_at = now() WHERE id = $1 RETURNING *",
      [id],
    );

    // Update payments table
    if (payments.length > 0) {
      await query("UPDATE payments SET status = 'refunded', updated_at = now() WHERE id = $1", [payments[0].id]);
    }

    // Restock variant inventory if requested
    if (restockItems) {
      const orderItems = await query<any>("SELECT variant_id, quantity FROM order_items WHERE order_id = $1", [id]);
      for (const it of orderItems) {
        if (it.variant_id) {
          const [v] = await query<any>("SELECT stock_qty FROM product_variants WHERE id = $1", [it.variant_id]);
          if (v) {
            const prev = v.stock_qty;
            const next = prev + it.quantity;
            await query("UPDATE product_variants SET stock_qty = $1 WHERE id = $2", [next, it.variant_id]);
            await query(
              `INSERT INTO inventory_logs (variant_id, quantity_change, previous_qty, new_qty, reason, order_id, notes)
               VALUES ($1, $2, $3, $4, 'return', $5, $6)`,
              [it.variant_id, it.quantity, prev, next, id, reason || "Customer refund restock"],
            );
          }
        }
      }
    }

    // Audit log
    await query(
      `INSERT INTO audit_logs (action, entity_type, entity_id, new_values, ip_address, user_agent)
       VALUES ('refund_processed', 'order', $1, $2, $3, $4)`,
      [
        id,
        JSON.stringify({
          refunded: true,
          stripeRefundId,
          reason: reason || "Admin triggered refund",
          restocked: restockItems,
        }),
        request.headers.get("x-forwarded-for"),
        request.headers.get("user-agent"),
      ],
    );

    return NextResponse.json(
      { success: true, message: "Refund processed successfully", order: updatedOrder },
      { headers: CORS_HEADERS },
    );
  } catch (error) {
    console.error("[POST /api/v1/admin/orders/[id]/refund]", error);
    return NextResponse.json({ error: "Failed to process refund" }, { status: 500, headers: CORS_HEADERS });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}
