/*
  # Enforce Strict Category-Items Relationship

  1. Changes
    - Clean up duplicate items first
    - Add NOT NULL constraint to category_id
    - Add unique constraint for item names within categories
    - Add validation triggers for category assignments
    
  2. Security
    - Maintain existing RLS policies
    - Ensure data integrity with constraints
*/

-- First, remove any items without a category
DELETE FROM items WHERE category_id IS NULL;

-- Remove duplicate items, keeping the first one created
DELETE FROM items a USING (
  SELECT category_id, name, created_at,
         ROW_NUMBER() OVER (PARTITION BY category_id, name ORDER BY created_at) as rnum
  FROM items
) b
WHERE a.category_id = b.category_id 
  AND a.name = b.name 
  AND b.rnum > 1;

-- Make category_id NOT NULL
ALTER TABLE items 
ALTER COLUMN category_id SET NOT NULL;

-- Add unique constraint for item names within categories
ALTER TABLE items
ADD CONSTRAINT unique_item_name_per_category UNIQUE (category_id, name);

-- Add trigger to prevent moving items between categories
CREATE OR REPLACE FUNCTION prevent_category_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.category_id != NEW.category_id THEN
    RAISE EXCEPTION 'Items cannot be moved between categories. Delete and recreate the item instead.';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_category_assignment
  BEFORE UPDATE ON items
  FOR EACH ROW
  WHEN (OLD.category_id IS NOT NULL)
  EXECUTE FUNCTION prevent_category_change();

-- Add trigger to ensure items belong to active categories
CREATE OR REPLACE FUNCTION validate_category_status()
RETURNS TRIGGER AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM categories 
    WHERE id = NEW.category_id 
    AND status = true
  ) THEN
    RAISE EXCEPTION 'Items can only be assigned to active categories';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_active_category
  BEFORE INSERT OR UPDATE ON items
  FOR EACH ROW
  EXECUTE FUNCTION validate_category_status();

-- Add trigger to prevent category deactivation when it has active items
CREATE OR REPLACE FUNCTION validate_category_deactivation()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status = true AND NEW.status = false AND EXISTS (
    SELECT 1 FROM items 
    WHERE category_id = OLD.id 
    AND status = true
  ) THEN
    RAISE EXCEPTION 'Cannot deactivate category with active items';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_category_deactivation
  BEFORE UPDATE ON categories
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION validate_category_deactivation();

-- Add comment explaining the relationship
COMMENT ON CONSTRAINT unique_item_name_per_category ON items IS 
  'Ensures each item name is unique within its category';

COMMENT ON TABLE items IS 
  'Items table with strict one-to-many relationship with categories. Items cannot be moved between categories.';