import { NextResponse } from "next/server";

import Stripe from "stripe";

import { query } from "@/lib/db/client";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "sk_test_placeholder_key", {
  apiVersion: "2026-08-26.dahlia" as any,
});

export async function POST(req: Request) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event: Stripe.Event;

  try {
    if (webhookSecret && sig) {
      event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
    } else {
      // In dev or local testing without webhook secret, parse payload directly
      event = JSON.parse(body) as Stripe.Event;
    }
  } catch (err: any) {
    console.error(`[Stripe Webhook Verification Error]: ${err.message}`);
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const orderId = session.metadata?.orderId;
        const cartSessionId = session.metadata?.cartSessionId;
        const userId = session.metadata?.userId;

        if (orderId) {
          // 1. Update order status to paid
          await query("UPDATE orders SET status = 'paid', updated_at = now() WHERE id = $1 AND status != 'paid'", [
            orderId,
          ]);

          // 2. Record payment
          const paymentIntentId = (session.payment_intent as string) || session.id;
          const amountTotal = (session.amount_total ?? 0) / 100;
          await query(
            `INSERT INTO payments (order_id, stripe_payment_intent_id, amount, currency, status)
             VALUES ($1, $2, $3, $4, 'succeeded')
             ON CONFLICT (stripe_payment_intent_id) DO UPDATE SET status = 'succeeded', updated_at = now()`,
            [orderId, paymentIntentId, amountTotal, session.currency || "gbp"],
          );

          // 3. Decrement inventory and log changes
          const orderItems = await query<any>(
            "SELECT product_id, variant_id, quantity FROM order_items WHERE order_id = $1",
            [orderId],
          );

          for (const item of orderItems) {
            if (item.variant_id) {
              const [v] = await query<any>("SELECT stock_qty FROM product_variants WHERE id = $1", [item.variant_id]);
              if (v) {
                const prev = v.stock_qty;
                const next = Math.max(0, prev - item.quantity);
                await query("UPDATE product_variants SET stock_qty = $1 WHERE id = $2", [next, item.variant_id]);
                await query(
                  `INSERT INTO inventory_logs (variant_id, quantity_change, previous_qty, new_qty, reason, order_id, notes)
                   VALUES ($1, $2, $3, $4, 'sale', $5, 'Automatic checkout decrement')`,
                  [item.variant_id, -item.quantity, prev, next, orderId],
                );
              }
            }
          }

          // 4. Clear cart if user or session provided
          if (userId) {
            await query("DELETE FROM cart_items WHERE cart_id IN (SELECT id FROM carts WHERE user_id = $1)", [userId]);
          } else if (cartSessionId) {
            await query("DELETE FROM cart_items WHERE cart_id IN (SELECT id FROM carts WHERE session_id = $1)", [
              cartSessionId,
            ]);
          }

          // 5. Audit log
          await query(
            `INSERT INTO audit_logs (action, entity_type, entity_id, new_values)
             VALUES ('order_status_changed', 'order', $1, $2)`,
            [orderId, JSON.stringify({ status: "paid", paymentIntent: paymentIntentId })],
          );
        }
        break;
      }

      case "payment_intent.payment_failed": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        const orderId = paymentIntent.metadata?.orderId;
        if (orderId) {
          await query("UPDATE orders SET status = 'payment_failed', updated_at = now() WHERE id = $1", [orderId]);
          await query(
            `INSERT INTO payments (order_id, stripe_payment_intent_id, amount, currency, status)
             VALUES ($1, $2, $3, $4, 'failed')
             ON CONFLICT (stripe_payment_intent_id) DO UPDATE SET status = 'failed', updated_at = now()`,
            [orderId, paymentIntent.id, paymentIntent.amount / 100, paymentIntent.currency],
          );
        }
        break;
      }

      case "charge.refunded": {
        const charge = event.data.object as Stripe.Charge;
        const paymentIntentId = charge.payment_intent as string;
        if (paymentIntentId) {
          const payments = await query<any>("SELECT order_id FROM payments WHERE stripe_payment_intent_id = $1", [
            paymentIntentId,
          ]);
          if (payments.length > 0) {
            const orderId = payments[0].order_id;
            await query("UPDATE orders SET status = 'refunded', updated_at = now() WHERE id = $1", [orderId]);
            await query(
              "UPDATE payments SET status = 'refunded', updated_at = now() WHERE stripe_payment_intent_id = $1",
              [paymentIntentId],
            );
          }
        }
        break;
      }

      default:
        console.log(`[Stripe Webhook] Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error("[Stripe Webhook Processing Error]", error);
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}
