/*
  # Enforce Single Driver Assignment

  1. Changes
    - Add unique constraint on order_id in package_orders table
    - Add trigger to prevent assigning orders to multiple packages
    - Add validation function to check existing assignments
    
  2. Implementation
    - Use unique constraint for data integrity
    - Add validation triggers for additional checks
    - Log assignment changes for auditing
*/

-- First remove any duplicate order assignments
WITH duplicates AS (
  SELECT order_id,
         ROW_NUMBER() OVER (PARTITION BY order_id ORDER BY created_at) as row_num
  FROM package_orders
)
DELETE FROM package_orders
WHERE order_id IN (
  SELECT order_id 
  FROM duplicates 
  WHERE row_num > 1
);

-- Add unique constraint on order_id
ALTER TABLE package_orders
ADD CONSTRAINT unique_order_assignment UNIQUE (order_id);

-- Create function to validate order assignment
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

  -- Log the assignment
  INSERT INTO package_logs (
    package_id,
    event_type,
    details
  ) VALUES (
    NEW.package_id,
    'order_assigned',
    jsonb_build_object(
      'order_id', NEW.order_id,
      'sequence_number', NEW.sequence_number
    )
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for order assignment validation
DROP TRIGGER IF EXISTS enforce_order_assignment ON package_orders;

CREATE TRIGGER enforce_order_assignment
  BEFORE INSERT OR UPDATE ON package_orders
  FOR EACH ROW
  EXECUTE FUNCTION validate_order_assignment();

-- Add comment explaining the constraint
COMMENT ON CONSTRAINT unique_order_assignment ON package_orders IS 
  'Ensures each order can only be assigned to one package';

-- Add comment explaining the trigger
COMMENT ON FUNCTION validate_order_assignment() IS 
  'Validates order assignments and updates order driver assignments';