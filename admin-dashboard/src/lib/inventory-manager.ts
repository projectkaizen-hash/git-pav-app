import { query } from "@/lib/db/client";

export type InventoryLogReason = "sale" | "restock" | "manual_adjustment" | "return" | "reservation" | "release";

export interface AdjustStockParams {
  variantId: string;
  quantityChange: number; // positive for restock/returns, negative for sales/deductions
  reason: InventoryLogReason;
  notes?: string;
  orderId?: string | null;
  performedBy?: string | null;
  allowNegative?: boolean;
}

export async function adjustStock({
  variantId,
  quantityChange,
  reason,
  notes,
  orderId,
  performedBy,
  allowNegative = false,
}: AdjustStockParams): Promise<{
  success: boolean;
  previousQty?: number;
  newQty?: number;
  error?: string;
}> {
  try {
    const variants = await query<any>("SELECT id, stock_qty, sku FROM product_variants WHERE id = $1", [variantId]);

    if (!variants.length) {
      return { success: false, error: "Variant not found" };
    }

    const previousQty = variants[0].stock_qty;
    const newQty = previousQty + quantityChange;

    if (newQty < 0 && !allowNegative) {
      return {
        success: false,
        error: `Insufficient stock for SKU ${variants[0].sku}. Current: ${previousQty}, requested reduction: ${Math.abs(quantityChange)}`,
      };
    }

    // 1. Update stock
    await query("UPDATE product_variants SET stock_qty = $1, updated_at = now() WHERE id = $2", [newQty, variantId]);

    // 2. Insert audit/inventory log
    await query(
      `INSERT INTO inventory_logs (
        variant_id,
        quantity_change,
        previous_qty,
        new_qty,
        reason,
        order_id,
        performed_by,
        notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [variantId, quantityChange, previousQty, newQty, reason, orderId || null, performedBy || null, notes || null],
    );

    return {
      success: true,
      previousQty,
      newQty,
    };
  } catch (err: any) {
    console.error("[adjustStock Error]", err);
    return { success: false, error: err.message || "Failed to adjust stock" };
  }
}

export async function getLowStockVariants(threshold = 10) {
  return query(
    `
    SELECT 
      pv.id,
      pv.sku,
      pv.attributes,
      pv.stock_qty,
      p.id as product_id,
      p.name as product_name,
      p.slug as product_slug,
      (
        SELECT url FROM product_images WHERE product_id = p.id AND is_primary = true LIMIT 1
      ) as image
    FROM product_variants pv
    JOIN products p ON pv.product_id = p.id
    WHERE pv.is_active = true AND pv.stock_qty <= $1
    ORDER BY pv.stock_qty ASC
  `,
    [threshold],
  );
}
