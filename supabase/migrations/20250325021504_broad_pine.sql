/*
  # Fix Order Assignment System

  1. Changes
    - Clean up duplicate assignments using first created assignment
    - Add unique constraint on order assignments
    - Add validation triggers
    - Prevent duplicate driver assignments
*/

-- First clean up any duplicate assignments by keeping the earliest one
WITH duplicate_assignments AS (
  SELECT o.id as order_id,
         FIRST_VALUE(dp.driver_id) OVER (
           PARTITION BY o.id 
           ORDER BY dp.created_at
         ) as first_driver_id
  FROM orders o
  JOIN package_orders po ON po.order_id = o.id
  JOIN driver_packages dp ON dp.id = po.package_id
  GROUP BY o.id, dp.driver_id, dp.created_at
  HAVING COUNT(*) > 1
)
UPDATE orders o
SET assigned_driver_id = da.first_driver_id
FROM duplicate_assignments da
WHERE o.id = da.order_id;

-- Remove duplicate package_orders entries keeping only the earliest one
DELETE FROM package_orders po1
WHERE EXISTS (
  SELECT 1 FROM package_orders po2
  WHERE po2.order_id = po1.order_id
  AND po2.created_at < po1.created_at
);

-- Add unique constraint to package_orders
ALTER TABLE package_orders
DROP CONSTRAINT IF EXISTS unique_order_assignment;

ALTER TABLE package_orders
ADD CONSTRAINT unique_order_assignment UNIQUE (order_id);

-- Create function to validate package assignments
CREATE OR REPLACE FUNCTION validate_order_assignment()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if order is already assigned to a package
  IF EXISTS (
    SELECT 1 FROM package_orders
    WHERE order_id = NEW.order_id
    AND package_id != COALESCE(NEW.package_id, -1)
  ) THEN
    RAISE EXCEPTION 'Order % is already assigned to a package', NEW.order_id;
  END IF;

  -- Check if order is already assigned to a different driver
  IF EXISTS (
    SELECT 1 
    FROM orders o
    JOIN driver_packages dp ON dp.id = NEW.package_id
    WHERE o.id = NEW.order_id
    AND o.assigned_driver_id IS NOT NULL
    AND o.assigned_driver_id != dp.driver_id
  ) THEN
    RAISE EXCEPTION 'Order % is already assigned to a different driver', NEW.order_id;
  END IF;

  -- Update order's assigned driver
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

-- Create trigger for package assignment validation
DROP TRIGGER IF EXISTS enforce_order_assignment ON package_orders;

CREATE TRIGGER enforce_order_assignment
  BEFORE INSERT OR UPDATE ON package_orders
  FOR EACH ROW
  EXECUTE FUNCTION validate_order_assignment();

-- Create function to prevent duplicate driver assignments
CREATE OR REPLACE FUNCTION prevent_duplicate_driver_assignment()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if order is already assigned to a different driver
  IF NEW.assigned_driver_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM orders
    WHERE id != NEW.id
    AND assigned_driver_id = NEW.assigned_driver_id
    AND date(estimated_delivery) = date(NEW.estimated_delivery)
  ) THEN
    RAISE EXCEPTION 'Order % cannot be assigned to driver % as they already have orders for this date',
      NEW.id, NEW.assigned_driver_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to prevent duplicate driver assignments
DROP TRIGGER IF EXISTS enforce_unique_driver_assignment ON orders;

CREATE TRIGGER enforce_unique_driver_assignment
  BEFORE UPDATE OF assigned_driver_id ON orders
  FOR EACH ROW
  EXECUTE FUNCTION prevent_duplicate_driver_assignment();

-- Add comments
COMMENT ON CONSTRAINT unique_order_assignment ON package_orders IS 
  'Ensures each order can only be assigned to one package';

COMMENT ON FUNCTION validate_order_assignment() IS 
  'Validates order assignments and prevents duplicate assignments';

COMMENT ON FUNCTION prevent_duplicate_driver_assignment() IS 
  'Prevents orders from being assigned to multiple drivers';