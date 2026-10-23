-- =============================================================================
-- 008_inventory_logs_audit_logs.sql — Inventory tracking and audit logging
-- =============================================================================

-- Inventory logs table: track all stock changes with reasons
CREATE TABLE IF NOT EXISTS inventory_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  variant_id UUID NOT NULL REFERENCES product_variants(id) ON DELETE CASCADE,
  quantity_change INT NOT NULL, -- negative for deductions, positive for additions
  previous_qty INT NOT NULL,
  new_qty INT NOT NULL,
  reason TEXT NOT NULL CHECK (reason IN ('sale', 'restock', 'manual_adjustment', 'return', 'reservation', 'release')),
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  performed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Audit logs table: track all admin actions for accountability
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action TEXT NOT NULL CHECK (action IN (
    'order_status_changed', 'price_changed', 'stock_adjusted', 
    'discount_created', 'discount_updated', 'discount_deleted',
    'shipping_created', 'shipping_updated', 'shipping_deleted',
    'product_created', 'product_updated', 'product_deleted',
    'category_created', 'category_updated', 'category_deleted',
    'refund_processed', 'order_notes_added'
  )),
  entity_type TEXT NOT NULL CHECK (entity_type IN ('order', 'product', 'discount', 'shipping', 'category', 'variant')),
  entity_id UUID NOT NULL,
  old_values JSONB,
  new_values JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_inventory_logs_variant_id ON inventory_logs(variant_id);
CREATE INDEX IF NOT EXISTS idx_inventory_logs_order_id ON inventory_logs(order_id);
CREATE INDEX IF NOT EXISTS idx_inventory_logs_performed_by ON inventory_logs(performed_by);
CREATE INDEX IF NOT EXISTS idx_inventory_logs_reason ON inventory_logs(reason);
CREATE INDEX IF NOT EXISTS idx_inventory_logs_created_at ON inventory_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_type ON audit_logs(entity_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_id ON audit_logs(entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
