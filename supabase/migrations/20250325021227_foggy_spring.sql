/*
  # Fix Duplicate Order Assignments

  1. Changes
    - Remove any existing duplicate assignments
    - Add unique constraint on orders.assigned_driver_id
    - Update package generation to respect unique assignments
    - Add validation trigger
*/

-- First clean up any duplicate driver assignments
UPDATE orders o
SET assigned_driver_id = (
  SELECT dp.driver_id
  FROM package_orders po
  JOIN driver_packages dp ON dp.id = po.package_id
  WHERE po.order_id = o.id
  ORDER BY dp.created_at
  LIMIT 1
)
WHERE EXISTS (
  SELECT 1
  FROM package_orders po1
  JOIN driver_packages dp1 ON dp1.id = po1.package_id
  JOIN package_orders po2 ON po2.order_id = po1.order_id
  JOIN driver_packages dp2 ON dp2.id = po2.package_id
  WHERE po1.order_id = o.id
  AND dp1.driver_id != dp2.driver_id
);

-- Remove duplicate package_orders entries
DELETE FROM package_orders po1
WHERE EXISTS (
  SELECT 1 FROM package_orders po2
  WHERE po2.order_id = po1.order_id
  AND po2.created_at < po1.created_at
);

-- Create trigger function to prevent duplicate driver assignments
CREATE OR REPLACE FUNCTION prevent_duplicate_driver_assignment()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.assigned_driver_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM orders
    WHERE id != NEW.id
    AND assigned_driver_id = NEW.assigned_driver_id
    AND date(estimated_delivery) = date(NEW.estimated_delivery)
  ) THEN
    RAISE EXCEPTION 'Order cannot be assigned to multiple drivers';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS enforce_unique_driver_assignment ON orders;

CREATE TRIGGER enforce_unique_driver_assignment
  BEFORE UPDATE OF assigned_driver_id ON orders
  FOR EACH ROW
  EXECUTE FUNCTION prevent_duplicate_driver_assignment();

-- Update validate_order_assignment function to be stricter
CREATE OR REPLACE FUNCTION validate_order_assignment()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if order is already assigned to a different package
  IF EXISTS (
    SELECT 1 
    FROM package_orders 
    WHERE order_id = NEW.order_id 
    AND package_id != NEW.package_id
  ) THEN
    RAISE EXCEPTION 'Order is already assigned to another package';
  END IF;

  -- Check if order's assigned driver matches package's driver
  IF EXISTS (
    SELECT 1 
    FROM orders o
    JOIN driver_packages dp ON dp.id = NEW.package_id
    WHERE o.id = NEW.order_id 
    AND o.assigned_driver_id IS NOT NULL 
    AND o.assigned_driver_id != dp.driver_id
  ) THEN
    RAISE EXCEPTION 'Order is assigned to a different driver';
  END IF;

  -- Update order's assigned driver to match package's driver
  UPDATE orders
  SET assigned_driver_id = (
    SELECT driver_id 
    FROM driver_packages 
    WHERE id = NEW.package_id
  )
  WHERE id = NEW.order_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add comments
COMMENT ON FUNCTION prevent_duplicate_driver_assignment() IS 
  'Prevents orders from being assigned to multiple drivers';

COMMENT ON FUNCTION validate_order_assignment() IS 
  'Validates order assignments and prevents duplicate assignments';