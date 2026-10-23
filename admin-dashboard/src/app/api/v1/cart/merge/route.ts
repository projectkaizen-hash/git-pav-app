import { NextResponse } from "next/server";

import { verifyToken } from "@/lib/auth/jwt";
import { query } from "@/lib/db/client";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": process.env.WEBSITE_ORIGIN ?? "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get("authorization") ?? "";
    let rawToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

    if (!rawToken) {
      const cookieHeader = request.headers.get("cookie") ?? "";
      const match = cookieHeader.match(/(?:^|;\s*)user_token=([^;]+)/);
      if (match) rawToken = decodeURIComponent(match[1]);
    }

    if (!rawToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: CORS_HEADERS });
    }

    const payload = await verifyToken(rawToken);
    const userId = payload?.userId;
    if (!userId) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401, headers: CORS_HEADERS });
    }

    const body = await request.json();
    const { sessionId } = body;

    if (!sessionId) {
      return NextResponse.json({ error: "sessionId is required" }, { status: 400, headers: CORS_HEADERS });
    }

    // Find guest cart
    const guestCart = await query<any>("SELECT id FROM carts WHERE session_id = $1", [sessionId]);
    if (!guestCart.length) {
      return NextResponse.json({ message: "No guest cart to merge" }, { headers: CORS_HEADERS });
    }

    // Find or create user cart
    const userCart = await query<any>("SELECT id FROM carts WHERE user_id = $1", [userId]);
    let userCartId: string;
    if (!userCart.length) {
      const created = await query<any>("INSERT INTO carts (user_id) VALUES ($1) RETURNING id", [userId]);
      userCartId = created[0].id;
    } else {
      userCartId = userCart[0].id;
    }

    // Get guest items
    const guestItems = await query<any>("SELECT product_id, variant_id, quantity FROM cart_items WHERE cart_id = $1", [
      guestCart[0].id,
    ]);

    for (const item of guestItems) {
      if (item.variant_id) {
        const existing = await query<any>(
          "SELECT id, quantity FROM cart_items WHERE cart_id = $1 AND product_id = $2 AND variant_id = $3",
          [userCartId, item.product_id, item.variant_id],
        );
        if (existing.length > 0) {
          await query("UPDATE cart_items SET quantity = quantity + $1 WHERE id = $2", [item.quantity, existing[0].id]);
        } else {
          await query("INSERT INTO cart_items (cart_id, product_id, variant_id, quantity) VALUES ($1, $2, $3, $4)", [
            userCartId,
            item.product_id,
            item.variant_id,
            item.quantity,
          ]);
        }
      } else {
        const existing = await query<any>(
          "SELECT id, quantity FROM cart_items WHERE cart_id = $1 AND product_id = $2 AND variant_id IS NULL",
          [userCartId, item.product_id],
        );
        if (existing.length > 0) {
          await query("UPDATE cart_items SET quantity = quantity + $1 WHERE id = $2", [item.quantity, existing[0].id]);
        } else {
          await query("INSERT INTO cart_items (cart_id, product_id, variant_id, quantity) VALUES ($1, $2, null, $3)", [
            userCartId,
            item.product_id,
            item.quantity,
          ]);
        }
      }
    }

    // Clean up guest cart
    await query("DELETE FROM carts WHERE id = $1", [guestCart[0].id]);

    return NextResponse.json({ success: true, message: "Cart merged successfully" }, { headers: CORS_HEADERS });
  } catch (error) {
    console.error("[POST /api/v1/cart/merge]", error);
    return NextResponse.json({ error: "Failed to merge cart" }, { status: 500, headers: CORS_HEADERS });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}
