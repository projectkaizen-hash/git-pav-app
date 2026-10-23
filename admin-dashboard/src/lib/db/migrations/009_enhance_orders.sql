-- =============================================================================
-- 009_enhance_orders.sql — Add additional columns to orders table for complete order management
-- =============================================================================

-- Add customer contact information
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'orders' AND column_name = 'customer_email'
  ) THEN
    ALTER TABLE orders ADD COLUMN customer_email TEXT;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'orders' AND column_name = 'customer_phone'
  ) THEN
    ALTER TABLE orders ADD COLUMN customer_phone TEXT;
  END IF;
END $$;

-- Add address information
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'orders' AND column_name = 'shipping_address'
  ) THEN
    ALTER TABLE orders ADD COLUMN shipping_address JSONB;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'orders' AND column_name = 'billing_address'
  ) THEN
    ALTER TABLE orders ADD COLUMN billing_address JSONB;
  END IF;
END $$;

-- Add financial breakdown
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'orders' AND column_name = 'subtotal'
  ) THEN
    ALTER TABLE orders ADD COLUMN subtotal NUMERIC(10,2);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'orders' AND column_name = 'shipping_cost'
  ) THEN
    ALTER TABLE orders ADD COLUMN shipping_cost NUMERIC(10,2);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'orders' AND column_name = 'tax_amount'
  ) THEN
    ALTER TABLE orders ADD COLUMN tax_amount NUMERIC(10,2);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'orders' AND column_name = 'discount_amount'
  ) THEN
    ALTER TABLE orders ADD COLUMN discount_amount NUMERIC(10,2);
  END IF;
END $$;

-- Add order notes and timestamps
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'orders' AND column_name = 'notes'
  ) THEN
    ALTER TABLE orders ADD COLUMN notes TEXT;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'orders' AND column_name = 'reserved_stock_at'
  ) THEN
    ALTER TABLE orders ADD COLUMN reserved_stock_at TIMESTAMPTZ;
  END IF;
END $$;

-- Enhance status field with proper constraints
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'orders' AND column_name = 'status'
  ) THEN
    ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;
    ALTER TABLE orders ADD CONSTRAINT orders_status_check 
      CHECK (status IN ('pending', 'payment_processing', 'paid', 'fulfilling', 'shipped', 'delivered', 'cancelled', 'payment_failed', 'refunded'));
  END IF;
END $$;

-- Add indexes for common queries
CREATE INDEX IF NOT EXISTS idx_orders_customer_email ON orders(customer_email);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_reserved_stock_at ON orders(reserved_stock_at);
