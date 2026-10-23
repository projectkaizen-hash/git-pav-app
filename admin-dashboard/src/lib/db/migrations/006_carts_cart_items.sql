-- =============================================================================
-- 006_carts_cart_items.sql — Cart system for guest and logged-in users
-- =============================================================================

-- Carts table: supports both guest carts (session_id) and user carts (user_id)
CREATE TABLE IF NOT EXISTS carts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  session_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id),
  UNIQUE(session_id)
);

-- Cart items table: items in a cart with quantity tracking
CREATE TABLE IF NOT EXISTS cart_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cart_id UUID NOT NULL REFERENCES carts(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  variant_id UUID REFERENCES product_variants(id) ON DELETE SET NULL,
  quantity INT NOT NULL CHECK (quantity > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(cart_id, product_id, variant_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_carts_user_id ON carts(user_id);
CREATE INDEX IF NOT EXISTS idx_carts_session_id ON carts(session_id);
CREATE INDEX IF NOT EXISTS idx_cart_items_cart_id ON cart_items(cart_id);
CREATE INDEX IF NOT EXISTS idx_cart_items_product_id ON cart_items(product_id);
CREATE INDEX IF NOT EXISTS idx_cart_items_variant_id ON cart_items(variant_id);
