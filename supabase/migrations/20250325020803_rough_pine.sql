/*
  # Fix Package Generation Function

  1. Changes
    - Fix loop variable declaration
    - Add proper variable declarations
    - Maintain transaction safety
    - Ensure unique order assignments
*/

-- Declare variables properly
CREATE OR REPLACE FUNCTION generate_driver_packages(shift_date date)
RETURNS void AS $$
DECLARE
  facility RECORD;
  available_driver RECORD;
  package_id uuid;
  order_count integer;
BEGIN
  -- Process each facility
  FOR facility IN (
    SELECT * FROM facilities WHERE status = true
  ) LOOP
    -- Process each facility in its own transaction
    BEGIN
      -- Lock unassigned orders for this facility to prevent race conditions
      WITH unassigned_orders AS (
        SELECT o.id
        FROM orders o
        WHERE o.facility_id = facility.id
        AND date(o.estimated_delivery) = shift_date
        AND o.status = 'processing'
        AND o.assigned_driver_id IS NULL
        -- Lock these rows
        FOR UPDATE SKIP LOCKED
      )
      -- Count unassigned orders
      SELECT COUNT(*)
      INTO order_count
      FROM unassigned_orders;

      -- Skip if no orders
      IF order_count = 0 THEN
        CONTINUE;
      END IF;

      -- Process available drivers
      FOR available_driver IN (
        SELECT d.id
        FROM drivers d
        JOIN facility_drivers fd ON d.id = fd.driver_id
        WHERE fd.facility_id = facility.id
        AND d.status = true
        AND NOT EXISTS (
          SELECT 1 FROM driver_packages dp
          WHERE dp.driver_id = d.id
          AND dp.package_date = shift_date
          AND dp.status IN ('pending', 'assigned', 'in_progress')
        )
        FOR UPDATE
      ) LOOP
        -- Create new package
        INSERT INTO driver_packages (
          driver_id,
          facility_id,
          package_date,
          start_time,
          end_time,
          status
        ) VALUES (
          available_driver.id,
          facility.id,
          shift_date,
          '09:00'::time,  -- Default shift times
          '17:00'::time,  -- These should come from driver_shifts
          'assigned'
        )
        RETURNING id INTO package_id;

        -- Assign unassigned orders to this package
        WITH orders_to_assign AS (
          SELECT o.id
          FROM orders o
          WHERE o.facility_id = facility.id
          AND date(o.estimated_delivery) = shift_date
          AND o.status = 'processing'
          AND o.assigned_driver_id IS NULL
          -- Lock these rows
          FOR UPDATE SKIP LOCKED
          LIMIT 15
        )
        INSERT INTO package_orders (
          package_id,
          order_id,
          sequence_number
        )
        SELECT 
          package_id,
          id,
          0
        FROM orders_to_assign;

        -- Update assigned orders
        UPDATE orders o
        SET assigned_driver_id = available_driver.id
        FROM package_orders po
        WHERE po.package_id = package_id
        AND po.order_id = o.id;

        -- Optimize route
        PERFORM optimize_route(package_id);

        -- Update order count
        SELECT COUNT(*)
        INTO order_count
        FROM orders o
        WHERE o.facility_id = facility.id
        AND date(o.estimated_delivery) = shift_date
        AND o.status = 'processing'
        AND o.assigned_driver_id IS NULL;

        EXIT WHEN order_count = 0;
      END LOOP;

      -- If we still have unassigned orders, create pending packages
      WHILE order_count > 0 LOOP
        -- Create pending package
        INSERT INTO driver_packages (
          facility_id,
          package_date,
          start_time,
          end_time,
          status
        ) VALUES (
          facility.id,
          shift_date,
          '09:00'::time,
          '17:00'::time,
          'pending'
        )
        RETURNING id INTO package_id;

        -- Assign remaining orders
        WITH orders_to_assign AS (
          SELECT o.id
          FROM orders o
          WHERE o.facility_id = facility.id
          AND date(o.estimated_delivery) = shift_date
          AND o.status = 'processing'
          AND o.assigned_driver_id IS NULL
          FOR UPDATE SKIP LOCKED
          LIMIT 15
        )
        INSERT INTO package_orders (
          package_id,
          order_id,
          sequence_number
        )
        SELECT 
          package_id,
          id,
          0
        FROM orders_to_assign;

        -- Optimize route
        PERFORM optimize_route(package_id);

        -- Update order count
        SELECT COUNT(*)
        INTO order_count
        FROM orders o
        WHERE o.facility_id = facility.id
        AND date(o.estimated_delivery) = shift_date
        AND o.status = 'processing'
        AND o.assigned_driver_id IS NULL;
      END LOOP;

    EXCEPTION WHEN OTHERS THEN
      -- Log error and continue with next facility
      INSERT INTO package_logs (
        event_type,
        details
      ) VALUES (
        'package_generation_error',
        jsonb_build_object(
          'facility_id', facility.id,
          'error', SQLERRM
        )
      );
    END;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Add comment explaining the function
COMMENT ON FUNCTION generate_driver_packages(date) IS 
  'Generates driver packages for the given date, ensuring unique order assignments';