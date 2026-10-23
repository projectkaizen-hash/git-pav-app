import { NextResponse } from "next/server";

import { verifyToken } from "@/lib/auth/jwt";
import { query } from "@/lib/db/client";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": process.env.WEBSITE_ORIGIN ?? "*",
  "Access-Control-Allow-Methods": "POST, PATCH, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

async function getUserIdFromRequest(req: Request): Promise<string | null> {
  const authHeader = req.headers.get("authorization") ?? "";
  let rawToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!rawToken) {
    const cookieHeader = req.headers.get("cookie") ?? "";
    const match = cookieHeader.match(/(?:^|;\s*)user_token=([^;]+)/);
    if (match) rawToken = decodeURIComponent(match[1]);
  }

  if (!rawToken) return null;

  try {
    const payload = await verifyToken(rawToken);
    return payload?.userId ? String(payload.userId) : null;
  } catch {
    return null;
  }
}

async function getOrCreateCart(userId: string | null, sessionId: string | null): Promise<string> {
  if (userId) {
    const existing = await query<any>("SELECT id FROM carts WHERE user_id = $1", [userId]);
    if (existing.length > 0) return existing[0].id;

    const inserted = await query<any>(
      "INSERT INTO carts (user_id) VALUES ($1) ON CONFLICT (user_id) DO UPDATE SET updated_at = now() RETURNING id",
      [userId],
    );
    return inserted[0].id;
  }

  if (sessionId) {
    const existing = await query<any>("SELECT id FROM carts WHERE session_id = $1", [sessionId]);
    if (existing.length > 0) return existing[0].id;

    const inserted = await query<any>(
      "INSERT INTO carts (session_id) VALUES ($1) ON CONFLICT (session_id) DO UPDATE SET updated_at = now() RETURNING id",
      [sessionId],
    );
    return inserted[0].id;
  }

  throw new Error("Either userId or sessionId must be provided");
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { productId, variantId, quantity = 1, sessionId } = body;
    const userId = await getUserIdFromRequest(request);

    if (!productId) {
      return NextResponse.json({ error: "productId is required" }, { status: 400, headers: CORS_HEADERS });
    }

    if (!userId && !sessionId) {
      return NextResponse.json(
        { error: "sessionId or user authentication required" },
        { status: 400, headers: CORS_HEADERS },
      );
    }

    // Check product existence
    const product = await query<any>("SELECT id, in_stock FROM products WHERE id = $1 AND published = true", [
      productId,
    ]);
    if (!product.length) {
      return NextResponse.json({ error: "Product not found or unavailable" }, { status: 404, headers: CORS_HEADERS });
    }

    // Check variant stock if variantId is provided
    if (variantId) {
      const variant = await query<any>(
        "SELECT id, stock_qty FROM product_variants WHERE id = $1 AND product_id = $2 AND is_active = true",
        [variantId, productId],
      );
      if (!variant.length) {
        return NextResponse.json({ error: "Variant not found" }, { status: 404, headers: CORS_HEADERS });
      }
      if (variant[0].stock_qty < quantity) {
        return NextResponse.json(
          { error: `Only ${variant[0].stock_qty} items in stock` },
          { status: 400, headers: CORS_HEADERS },
        );
      }
    }

    const cartId = await getOrCreateCart(userId, sessionId);

    // Check if item already in cart
    let existingItem: any[] = [];
    if (variantId) {
      existingItem = await query(
        "SELECT id, quantity FROM cart_items WHERE cart_id = $1 AND product_id = $2 AND variant_id = $3",
        [cartId, productId, variantId],
      );
    } else {
      existingItem = await query(
        "SELECT id, quantity FROM cart_items WHERE cart_id = $1 AND product_id = $2 AND variant_id IS NULL",
        [cartId, productId],
      );
    }

    if (existingItem.length > 0) {
      const newQty = existingItem[0].quantity + quantity;
      await query("UPDATE cart_items SET quantity = $1, updated_at = now() WHERE id = $2", [
        newQty,
        existingItem[0].id,
      ]);
    } else {
      await query(
        `INSERT INTO cart_items (cart_id, product_id, variant_id, quantity)
         VALUES ($1, $2, $3, $4)`,
        [cartId, productId, variantId || null, quantity],
      );
    }

    return NextResponse.json({ success: true, message: "Item added to cart" }, { status: 201, headers: CORS_HEADERS });
  } catch (error: any) {
    console.error("[POST /api/v1/cart/items]", error);
    return NextResponse.json({ error: error.message || "Failed to add item" }, { status: 500, headers: CORS_HEADERS });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { itemId, quantity } = body;

    if (!itemId || quantity === undefined) {
      return NextResponse.json({ error: "itemId and quantity are required" }, { status: 400, headers: CORS_HEADERS });
    }

    if (quantity <= 0) {
      await query("DELETE FROM cart_items WHERE id = $1", [itemId]);
      return NextResponse.json({ success: true, message: "Item removed" }, { headers: CORS_HEADERS });
    }

    // Check stock if variant
    const item = await query<any>(
      `
      SELECT ci.id, ci.variant_id, pv.stock_qty
      FROM cart_items ci
      LEFT JOIN product_variants pv ON ci.variant_id = pv.id
      WHERE ci.id = $1
    `,
      [itemId],
    );

    if (!item.length) {
      return NextResponse.json({ error: "Cart item not found" }, { status: 404, headers: CORS_HEADERS });
    }

    if (item[0].variant_id && item[0].stock_qty < quantity) {
      return NextResponse.json(
        { error: `Cannot set quantity greater than available stock (${item[0].stock_qty})` },
        { status: 400, headers: CORS_HEADERS },
      );
    }

    await query("UPDATE cart_items SET quantity = $1, updated_at = now() WHERE id = $2", [quantity, itemId]);

    return NextResponse.json({ success: true, quantity }, { headers: CORS_HEADERS });
  } catch (error) {
    console.error("[PATCH /api/v1/cart/items]", error);
    return NextResponse.json({ error: "Failed to update item" }, { status: 500, headers: CORS_HEADERS });
  }
}

export async function DELETE(request: Request) {
  try {
    const body = await request.json();
    const { itemId } = body;

    if (!itemId) {
      return NextResponse.json({ error: "itemId is required" }, { status: 400, headers: CORS_HEADERS });
    }

    await query("DELETE FROM cart_items WHERE id = $1", [itemId]);

    return NextResponse.json({ success: true, message: "Item removed" }, { headers: CORS_HEADERS });
  } catch (error) {
    console.error("[DELETE /api/v1/cart/items]", error);
    return NextResponse.json({ error: "Failed to delete item" }, { status: 500, headers: CORS_HEADERS });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}
