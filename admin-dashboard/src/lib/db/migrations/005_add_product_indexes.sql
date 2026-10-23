-- =============================================================================
-- 005_add_product_indexes.sql — Additional performance indexes
-- =============================================================================

-- Index for variant stock queries
CREATE INDEX IF NOT EXISTS idx_product_variants_stock_qty ON product_variants(stock_qty);

-- Index for products with category and published status
CREATE INDEX IF NOT EXISTS idx_products_category_published ON products(category_id, published);

-- Index for product images queries
CREATE INDEX IF NOT EXISTS idx_product_images_product_id ON product_images(product_id);
CREATE INDEX IF NOT EXISTS idx_product_images_is_primary ON product_images(is_primary);

-- Index for orders by user and status
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);

-- Index for order items
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON order_items(product_id);
