-- =============================================================================
-- 010_add_variant_to_order_items.sql — Add variant_id to order_items table
-- =============================================================================

-- Add variant_id column to order_items to support product variants
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'order_items' AND column_name = 'variant_id'
  ) THEN
    ALTER TABLE order_items ADD COLUMN variant_id UUID REFERENCES product_variants(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Add index for variant_id
CREATE INDEX IF NOT EXISTS idx_order_items_variant_id ON order_items(variant_id);