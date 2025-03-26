/*
  # Add Automatic Package Generation System

  1. Changes
    - Add function to find available driver for an order
    - Add function to handle package generation for a single order
    - Add trigger to automatically generate packages for orders
    
  2. Implementation
    - Find driver with least orders for the day
    - Create or assign to existing package
    - Update order's assigned driver
    - Log package assignments
*/

-- Create function to find available driver for an order
CREATE OR REPLACE FUNCTION find_available_driver(
  facility_id uuid,
  delivery_date date,
  delivery_time time
)
RETURNS uuid AS $$
DECLARE
  available_driver_id uuid;
BEGIN
  -- Find driver assigned to facility with least orders for the day
  SELECT d.id
  INTO available_driver_id
  FROM drivers d
  JOIN facility_drivers fd ON d.id = fd.driver_id
  WHERE fd.facility_id = find_available_driver.facility_id
  AND d.status = true
  AND NOT EXISTS (
    -- Exclude drivers who already have a full package (15 orders)
    SELECT 1 FROM driver_packages dp
    JOIN package_orders po ON dp.id = po.package_id
    WHERE dp.driver_id = d.id
    AND dp.package_date = delivery_date
    GROUP BY dp.id
    HAVING COUNT(*) >= 15
  )
  ORDER BY (
    -- Count current orders for this date
    SELECT COUNT(*)
    FROM driver_packages dp
    JOIN package_orders po ON dp.id = po.package_id
    WHERE dp.driver_id = d.id
    AND dp.package_date = delivery_date
  ) ASC
  LIMIT 1;

  RETURN available_driver_id;
END;
$$ LANGUAGE plpgsql;

-- Create function to handle package generation for a single order
CREATE OR REPLACE FUNCTION handle_order_package()
RETURNS TRIGGER AS $$
DECLARE
  delivery_date date;
  delivery_time time;
  available_driver_id uuid;
  package_id uuid;
  existing_package_id uuid;
BEGIN
  -- Only handle processing orders with facility assigned
  IF NEW.status != 'processing' OR NEW.facility_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Get delivery date and time
  delivery_date := date(NEW.estimated_delivery);
  delivery_time := NEW.estimated_delivery::time;

  -- Check if order is already assigned to a package
  SELECT package_id INTO existing_package_id
  FROM package_orders
  WHERE order_id = NEW.id;

  IF existing_package_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- Find available driver
  available_driver_id := find_available_driver(
    NEW.facility_id,
    delivery_date,
    delivery_time
  );

  -- Find or create package for this driver and date
  SELECT dp.id INTO package_id
  FROM driver_packages dp
  LEFT JOIN package_orders po ON dp.id = po.package_id
  WHERE dp.driver_id = available_driver_id
  AND dp.package_date = delivery_date
  GROUP BY dp.id
  HAVING COUNT(po.id) < 15
  ORDER BY dp.created_at DESC
  LIMIT 1;

  -- Create new package if none found
  IF package_id IS NULL AND available_driver_id IS NOT NULL THEN
    INSERT INTO driver_packages (
      driver_id,
      facility_id,
      package_date,
      start_time,
      end_time,
      status
    ) VALUES (
      available_driver_id,
      NEW.facility_id,
      delivery_date,
      '09:00'::time, -- Default shift times
      '17:00'::time,
      'assigned'
    )
    RETURNING id INTO package_id;
  END IF;

  -- If no package could be created, create a pending package
  IF package_id IS NULL THEN
    INSERT INTO driver_packages (
      facility_id,
      package_date,
      start_time,
      end_time,
      status
    ) VALUES (
      NEW.facility_id,
      delivery_date,
      '09:00'::time,
      '17:00'::time,
      'pending'
    )
    RETURNING id INTO package_id;
  END IF;

  -- Assign order to package
  INSERT INTO package_orders (
    package_id,
    order_id,
    sequence_number,
    estimated_arrival,
    status
  ) VALUES (
    package_id,
    NEW.id,
    (
      SELECT COALESCE(MAX(sequence_number), 0) + 1
      FROM package_orders
      WHERE package_id = package_id
    ),
    delivery_time,
    'pending'
  );

  -- Update order's assigned driver
  IF available_driver_id IS NOT NULL THEN
    NEW.assigned_driver_id := available_driver_id;
  END IF;

  -- Log package assignment
  INSERT INTO package_logs (
    package_id,
    event_type,
    details
  ) VALUES (
    package_id,
    'order_assigned',
    jsonb_build_object(
      'order_id', NEW.id,
      'driver_id', available_driver_id,
      'facility_id', NEW.facility_id
    )
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic package generation
DROP TRIGGER IF EXISTS generate_package_for_order ON orders;

CREATE TRIGGER generate_package_for_order
  BEFORE INSERT OR UPDATE OF status, facility_id, estimated_delivery
  ON orders
  FOR EACH ROW
  EXECUTE FUNCTION handle_order_package();

-- Add comment explaining the trigger
COMMENT ON FUNCTION handle_order_package() IS 
  'Automatically generates or assigns packages for orders when they are created or updated';