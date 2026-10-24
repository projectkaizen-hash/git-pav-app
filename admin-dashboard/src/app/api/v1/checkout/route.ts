import { NextResponse } from "next/server";

import Stripe from "stripe";

import { verifyShopperToken } from "@/lib/auth/jwt";
import { query } from "@/lib/db/client";
import { calculateCartTax } from "@/lib/tax-calculator";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": process.env.WEBSITE_ORIGIN ?? "http://localhost:8080",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "sk_test_placeholder_key", {
  apiVersion: "2026-08-26.dahlia" as any,
});

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
    const payload = await verifyShopperToken(rawToken);
    return payload?.userId ? String(payload.userId) : null;
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      items,
      customerEmail,
      customerPhone,
      shippingAddress,
      billingAddress,
      shippingMethodId,
      discountCode,
      notes,
      sessionId: cartSessionId,
    } = body;

    const userId = await getUserIdFromRequest(request);

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "Cart items cannot be empty" }, { status: 400, headers: CORS_HEADERS });
    }

    if (!customerEmail) {
      return NextResponse.json({ error: "Customer email is required" }, { status: 400, headers: CORS_HEADERS });
    }

    // 1. Resolve and validate product & variant prices and stock
    let subtotal = 0;
    const resolvedItems: any[] = [];

    for (const item of items) {
      const { productId, variantId, quantity = 1 } = item;
      if (quantity <= 0) continue;

      const [product] = await query<any>(
        "SELECT id, name, price, in_stock FROM products WHERE id = $1 AND published = true",
        [productId],
      );

      if (!product) {
        return NextResponse.json({ error: `Product not found: ${productId}` }, { status: 400, headers: CORS_HEADERS });
      }

      let unitPrice = parseFloat(product.price);
      let variantName = "";

      if (variantId) {
        const [variant] = await query<any>(
          "SELECT id, sku, attributes, price_override, stock_qty FROM product_variants WHERE id = $1 AND is_active = true",
          [variantId],
        );
        if (!variant) {
          return NextResponse.json(
            { error: `Variant not found: ${variantId}` },
            { status: 400, headers: CORS_HEADERS },
          );
        }
        if (variant.stock_qty < quantity) {
          return NextResponse.json(
            { error: `Insufficient stock for SKU ${variant.sku}. Available: ${variant.stock_qty}` },
            { status: 400, headers: CORS_HEADERS },
          );
        }
        if (variant.price_override) {
          unitPrice = parseFloat(variant.price_override);
        }
        variantName = ` (${variant.sku})`;
      }

      const itemTotal = unitPrice * quantity;
      subtotal += itemTotal;

      resolvedItems.push({
        productId: product.id,
        variantId: variantId || null,
        name: `${product.name}${variantName}`,
        unitPrice,
        quantity,
        total: itemTotal,
      });
    }

    // 2. Shipping calculation
    let shippingCost = 0;
    let shippingMethodRecord: any = null;
    if (shippingMethodId) {
      const methods = await query<any>("SELECT * FROM shipping_methods WHERE id = $1 AND is_active = true", [
        shippingMethodId,
      ]);
      if (methods.length > 0) {
        shippingMethodRecord = methods[0];
        const basePrice = parseFloat(shippingMethodRecord.base_price);
        const freeThreshold = shippingMethodRecord.free_shipping_threshold
          ? parseFloat(shippingMethodRecord.free_shipping_threshold)
          : null;

        if (freeThreshold !== null && subtotal >= freeThreshold) {
          shippingCost = 0;
        } else {
          shippingCost = basePrice;
        }
      }
    } else {
      // Default standard UK shipping
      shippingCost = subtotal >= 40 ? 0 : 3.99;
    }

    // 3. Discount calculation
    let discountAmount = 0;
    let discountRecord: any = null;
    if (discountCode) {
      const discounts = await query<any>("SELECT * FROM discounts WHERE UPPER(code) = $1 AND is_active = true", [
        discountCode.trim().toUpperCase(),
      ]);
      if (discounts.length > 0) {
        const disc = discounts[0];
        const now = new Date();
        const isValidDate =
          (!disc.valid_from || new Date(disc.valid_from) <= now) &&
          (!disc.valid_until || new Date(disc.valid_until) >= now);
        const isValidUsage = disc.max_uses === null || (disc.used_count || 0) < disc.max_uses;
        const minVal = disc.min_order_value ? parseFloat(disc.min_order_value) : 0;

        if (isValidDate && isValidUsage && subtotal >= minVal) {
          discountRecord = disc;
          if (disc.type === "percentage") {
            discountAmount = Math.round(((subtotal * parseFloat(disc.value)) / 100) * 100) / 100;
          } else {
            discountAmount = Math.min(subtotal, parseFloat(disc.value));
          }
        }
      }
    }

    // 4. Tax (VAT) Calculation
    const taxableAmount = Math.max(0, subtotal - discountAmount);
    const taxResult = calculateCartTax(
      [{ amount: taxableAmount }],
      'GB' // UK default
    );
    const taxAmount = taxResult.taxAmount;

    // Total
    const total = Math.max(0, Math.round((subtotal - discountAmount + shippingCost + taxAmount) * 100) / 100);

    // 5. Create Order in Database
    const [order] = await query<any>(
      `INSERT INTO orders (
        user_id,
        customer_email,
        customer_phone,
        shipping_address,
        billing_address,
        subtotal,
        shipping_cost,
        discount_amount,
        tax_amount,
        total,
        notes,
        status,
        reserved_stock_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'pending', now())
      RETURNING id`,
      [
        userId || null,
        customerEmail,
        customerPhone || null,
        JSON.stringify(shippingAddress || {}),
        JSON.stringify(billingAddress || shippingAddress || {}),
        subtotal,
        shippingCost,
        discountAmount,
        taxAmount,
        total,
        notes || null,
      ],
    );

    const orderId = order.id;

    // Insert order items
    for (const item of resolvedItems) {
      await query(
        `INSERT INTO order_items (order_id, product_id, variant_id, quantity, unit_price)
         VALUES ($1, $2, $3, $4, $5)`,
        [orderId, item.productId, item.variantId, item.quantity, item.unitPrice],
      );
    }

    // Insert discount if used
    if (discountRecord && discountAmount > 0) {
      await query(
        `INSERT INTO order_discounts (order_id, discount_id, amount_off)
         VALUES ($1, $2, $3)`,
        [orderId, discountRecord.id, discountAmount],
      );
      // Increment used count
      await query("UPDATE discounts SET used_count = COALESCE(used_count, 0) + 1 WHERE id = $1", [discountRecord.id]);
    }

    // Insert shipping record
    if (shippingMethodRecord) {
      await query(
        `INSERT INTO order_shipping (order_id, shipping_method_id)
         VALUES ($1, $2)`,
        [orderId, shippingMethodRecord.id],
      );
    }

    // 6. Create Stripe Checkout Session
    const storefrontUrl = process.env.WEBSITE_ORIGIN || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:8080";
    let stripeSession: Stripe.Checkout.Session | null = null;

    try {
      const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = resolvedItems.map((item) => ({
        price_data: {
          currency: "gbp",
          product_data: {
            name: item.name,
          },
          unit_amount: Math.round(item.unitPrice * 100),
        },
        quantity: item.quantity,
      }));

      // Add shipping line if > 0
      if (shippingCost > 0) {
        lineItems.push({
          price_data: {
            currency: "gbp",
            product_data: {
              name: `Delivery (${shippingMethodRecord?.name || "Standard UK"})`,
            },
            unit_amount: Math.round(shippingCost * 100),
          },
          quantity: 1,
        });
      }

      stripeSession = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        line_items: lineItems,
        mode: "payment",
        customer_email: customerEmail,
        success_url: `${storefrontUrl}/order/${orderId}?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${storefrontUrl}/checkout`,
        metadata: {
          orderId,
          userId: userId || "",
          cartSessionId: cartSessionId || "",
        },
      });

      // Update order with stripe session id
      await query("UPDATE orders SET stripe_session_id = $1 WHERE id = $2", [stripeSession.id, orderId]);
    } catch (stripeErr: any) {
      console.warn("[Stripe Checkout Session Warning]:", stripeErr.message);
      // In dev or without Stripe keys, gracefully provide direct order url
    }

    return NextResponse.json(
      {
        orderId,
        sessionId: stripeSession?.id || null,
        url: stripeSession?.url || `${storefrontUrl}/order/${orderId}`,
        total,
      },
      { status: 201, headers: CORS_HEADERS },
    );
  } catch (error: any) {
    console.error("[POST /api/v1/checkout]", error);
    return NextResponse.json({ error: error.message || "Checkout failed" }, { status: 500, headers: CORS_HEADERS });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}
