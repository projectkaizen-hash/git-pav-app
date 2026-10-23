import { NextResponse } from "next/server";

import { verifyToken } from "@/lib/auth/jwt";
import { query } from "@/lib/db/client";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": process.env.WEBSITE_ORIGIN ?? "*",
  "Access-Control-Allow-Methods": "GET, DELETE, OPTIONS",
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

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get("sessionId");
    const userId = await getUserIdFromRequest(request);

    if (!userId && !sessionId) {
      return NextResponse.json({ cart: null, items: [], total: 0 }, { headers: CORS_HEADERS });
    }

    // Find cart
    let cartRows: any[] = [];
    if (userId) {
      cartRows = await query("SELECT * FROM carts WHERE user_id = $1", [userId]);
    } else if (sessionId) {
      cartRows = await query("SELECT * FROM carts WHERE session_id = $1", [sessionId]);
    }

    if (!cartRows.length) {
      return NextResponse.json({ cart: null, items: [], total: 0 }, { headers: CORS_HEADERS });
    }

    const cart = cartRows[0];

    // Fetch items with product & variant details
    const items = await query(
      `
      SELECT 
        ci.id,
        ci.cart_id,
        ci.product_id,
        ci.variant_id,
        ci.quantity,
        p.name as product_name,
        p.slug as product_slug,
        p.price as base_price,
        p.in_stock as product_in_stock,
        (
          SELECT url FROM product_images pi 
          WHERE pi.product_id = p.id AND pi.is_primary = true 
          LIMIT 1
        ) as image,
        pv.sku as variant_sku,
        pv.attributes as variant_attributes,
        pv.price_override,
        pv.stock_qty as variant_stock,
        COALESCE(pv.price_override, p.price) as unit_price
      FROM cart_items ci
      JOIN products p ON ci.product_id = p.id
      LEFT JOIN product_variants pv ON ci.variant_id = pv.id
      WHERE ci.cart_id = $1
      ORDER BY ci.created_at ASC
    `,
      [cart.id],
    );

    const formattedItems = items.map((item: any) => {
      const unitPrice = parseFloat(item.unit_price);
      return {
        id: item.id,
        productId: item.product_id,
        variantId: item.variant_id,
        name: item.product_name,
        slug: item.product_slug,
        image:
          item.image || "https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=800&q=85",
        variantSku: item.variant_sku,
        variantAttributes: item.variant_attributes,
        unitPrice,
        quantity: item.quantity,
        itemTotal: unitPrice * item.quantity,
        inStock: item.variant_id ? item.variant_stock > 0 : item.product_in_stock,
        availableStock: item.variant_id ? item.variant_stock : 100,
      };
    });

    const total = formattedItems.reduce((sum, it) => sum + it.itemTotal, 0);

    return NextResponse.json(
      {
        cart: { id: cart.id, userId: cart.user_id, sessionId: cart.session_id },
        items: formattedItems,
        total: Math.round(total * 100) / 100,
      },
      { headers: CORS_HEADERS },
    );
  } catch (error) {
    console.error("[GET /api/v1/cart]", error);
    return NextResponse.json({ error: "Failed to fetch cart" }, { status: 500, headers: CORS_HEADERS });
  }
}

export async function DELETE(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const userId = await getUserIdFromRequest(request);
    const sessionId = body.sessionId;

    if (!userId && !sessionId) {
      return NextResponse.json({ error: "User or session required" }, { status: 400, headers: CORS_HEADERS });
    }

    if (userId) {
      await query(`DELETE FROM cart_items WHERE cart_id IN (SELECT id FROM carts WHERE user_id = $1)`, [userId]);
    } else if (sessionId) {
      await query(`DELETE FROM cart_items WHERE cart_id IN (SELECT id FROM carts WHERE session_id = $1)`, [sessionId]);
    }

    return NextResponse.json({ success: true, message: "Cart cleared" }, { headers: CORS_HEADERS });
  } catch (error) {
    console.error("[DELETE /api/v1/cart]", error);
    return NextResponse.json({ error: "Failed to clear cart" }, { status: 500, headers: CORS_HEADERS });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}
