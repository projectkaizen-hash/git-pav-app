-- =============================================================================
-- 002_add_unique_constraints.sql — Add unique constraints to prevent duplicates
-- =============================================================================

-- Add unique constraint to pricing_plans
ALTER TABLE pricing_plans ADD CONSTRAINT pricing_plans_name_unique UNIQUE (name);

-- Add unique constraint to fee_categories  
ALTER TABLE fee_categories ADD CONSTRAINT fee_categories_name_unique UNIQUE (name);

-- Add composite unique constraint to fee_items (category_id, name)
ALTER TABLE fee_items ADD CONSTRAINT fee_items_category_name_unique UNIQUE (category_id, name);

-- Add unique constraint to announcements
ALTER TABLE announcements ADD CONSTRAINT announcements_title_unique UNIQUE (title);