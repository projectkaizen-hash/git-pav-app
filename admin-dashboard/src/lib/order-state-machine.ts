import { query } from "@/lib/db/client";

export type OrderStatus =
  | "pending"
  | "payment_processing"
  | "paid"
  | "fulfilling"
  | "shipped"
  | "delivered"
  | "cancelled"
  | "payment_failed"
  | "refunded";

export const ALLOWED_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending: ["payment_processing", "paid", "cancelled", "payment_failed"],
  payment_processing: ["paid", "payment_failed", "cancelled"],
  paid: ["fulfilling", "cancelled", "refunded"],
  fulfilling: ["shipped", "cancelled", "refunded"],
  shipped: ["delivered", "refunded"],
  delivered: ["refunded"],
  cancelled: [],
  payment_failed: ["pending", "cancelled"],
  refunded: [],
};

export interface TransitionParams {
  orderId: string;
  toStatus: OrderStatus;
  reason?: string;
  trackingNumber?: string;
  trackingUrl?: string;
  performedBy?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export async function transitionOrderStatus({
  orderId,
  toStatus,
  reason,
  trackingNumber,
  trackingUrl,
  performedBy,
  ipAddress,
  userAgent,
}: TransitionParams): Promise<{ success: boolean; order?: any; error?: string }> {
  const [order] = await query<any>("SELECT * FROM orders WHERE id = $1", [orderId]);

  if (!order) {
    return { success: false, error: "Order not found" };
  }

  const currentStatus = order.status as OrderStatus;

  if (currentStatus === toStatus) {
    return { success: true, order };
  }

  const allowed = ALLOWED_TRANSITIONS[currentStatus] || [];
  if (!allowed.includes(toStatus)) {
    return {
      success: false,
      error: `Invalid transition: cannot move order from '${currentStatus}' to '${toStatus}'`,
    };
  }

  // 1. Update order status
  const [updatedOrder] = await query<any>(
    "UPDATE orders SET status = $1, updated_at = now() WHERE id = $2 RETURNING *",
    [toStatus, orderId],
  );

  // 2. If moving to shipped, update order_shipping tracking info
  if (toStatus === "shipped") {
    const existingShipping = await query<any>("SELECT id FROM order_shipping WHERE order_id = $1", [orderId]);
    if (existingShipping.length > 0) {
      await query(
        `UPDATE order_shipping 
         SET tracking_number = COALESCE($1, tracking_number),
             tracking_url = COALESCE($2, tracking_url),
             shipped_at = now()
         WHERE order_id = $3`,
        [trackingNumber || null, trackingUrl || null, orderId],
      );
    } else {
      await query(
        `INSERT INTO order_shipping (order_id, tracking_number, tracking_url, shipped_at)
         VALUES ($1, $2, $3, now())`,
        [orderId, trackingNumber || null, trackingUrl || null],
      );
    }
  }

  // 3. If delivered, record delivered_at
  if (toStatus === "delivered") {
    await query("UPDATE order_shipping SET delivered_at = now() WHERE order_id = $1", [orderId]);
  }

  // 4. If cancelled from paid/fulfilling, release stock back
  if (toStatus === "cancelled" && ["paid", "fulfilling"].includes(currentStatus)) {
    const items = await query<any>("SELECT variant_id, quantity FROM order_items WHERE order_id = $1", [orderId]);

    for (const item of items) {
      if (item.variant_id) {
        const [v] = await query<any>("SELECT stock_qty FROM product_variants WHERE id = $1", [item.variant_id]);
        if (v) {
          const prev = v.stock_qty;
          const next = prev + item.quantity;
          await query("UPDATE product_variants SET stock_qty = $1 WHERE id = $2", [next, item.variant_id]);
          await query(
            `INSERT INTO inventory_logs (variant_id, quantity_change, previous_qty, new_qty, reason, order_id, notes)
             VALUES ($1, $2, $3, $4, 'release', $5, 'Restored stock on order cancellation')`,
            [item.variant_id, item.quantity, prev, next, orderId],
          );
        }
      }
    }
  }

  // 5. Record in audit_logs
  await query(
    `INSERT INTO audit_logs (action, entity_type, entity_id, old_values, new_values, user_id, ip_address, user_agent)
     VALUES ('order_status_changed', 'order', $1, $2, $3, $4, $5, $6)`,
    [
      orderId,
      JSON.stringify({ status: currentStatus }),
      JSON.stringify({ status: toStatus, reason: reason || null, trackingNumber: trackingNumber || null }),
      performedBy || null,
      ipAddress || null,
      userAgent || null,
    ],
  );

  return { success: true, order: updatedOrder };
}
