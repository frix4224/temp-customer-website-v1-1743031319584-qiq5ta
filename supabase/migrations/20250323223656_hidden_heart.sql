/*
  # Enforce Service-Item Relationship

  1. Changes
    - Add service_id column to items table
    - Add foreign key constraint to ensure items belong to one service
    - Add triggers to enforce data integrity
    - Update existing items with their service IDs
    
  2. Security
    - Add validation to ensure items can only be assigned to active services
    - Prevent items from being moved between services
*/

-- Add service_id column to items
ALTER TABLE items
ADD COLUMN service_id uuid REFERENCES services(id);

-- Update existing items with their service IDs
UPDATE items i
SET service_id = s.id
FROM categories c
JOIN services s ON c.service_id = s.id
WHERE i.category_id = c.id;

-- Make service_id NOT NULL after updating existing data
ALTER TABLE items
ALTER COLUMN service_id SET NOT NULL;

-- Add trigger to prevent moving items between services
CREATE OR REPLACE FUNCTION prevent_service_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.service_id != NEW.service_id THEN
    RAISE EXCEPTION 'Items cannot be moved between services. Delete and recreate the item instead.';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_service_assignment
  BEFORE UPDATE ON items
  FOR EACH ROW
  WHEN (OLD.service_id IS NOT NULL)
  EXECUTE FUNCTION prevent_service_change();

-- Add trigger to ensure items belong to active services
CREATE OR REPLACE FUNCTION validate_service_status()
RETURNS TRIGGER AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM services 
    WHERE id = NEW.service_id 
    AND status = true
  ) THEN
    RAISE EXCEPTION 'Items can only be assigned to active services';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_active_service
  BEFORE INSERT OR UPDATE ON items
  FOR EACH ROW
  EXECUTE FUNCTION validate_service_status();

-- Add trigger to prevent service deactivation when it has active items
CREATE OR REPLACE FUNCTION validate_service_deactivation()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status = true AND NEW.status = false AND EXISTS (
    SELECT 1 FROM items 
    WHERE service_id = OLD.id 
    AND status = true
  ) THEN
    RAISE EXCEPTION 'Cannot deactivate service with active items';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_service_deactivation
  BEFORE UPDATE ON services
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION validate_service_deactivation();

-- Add trigger to ensure service_id matches category's service
CREATE OR REPLACE FUNCTION validate_service_category_match()
RETURNS TRIGGER AS $$
DECLARE
  category_service_id uuid;
BEGIN
  SELECT service_id INTO category_service_id
  FROM categories
  WHERE id = NEW.category_id;

  IF NEW.service_id != category_service_id THEN
    RAISE EXCEPTION 'Item service must match the category service';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_service_category_match
  BEFORE INSERT OR UPDATE ON items
  FOR EACH ROW
  EXECUTE FUNCTION validate_service_category_match();

-- Add comments explaining the relationships
COMMENT ON COLUMN items.service_id IS 
  'Reference to the service this item belongs to. Items can only belong to one service.';

COMMENT ON TABLE items IS 
  'Items table with strict one-to-many relationship with services and categories.';