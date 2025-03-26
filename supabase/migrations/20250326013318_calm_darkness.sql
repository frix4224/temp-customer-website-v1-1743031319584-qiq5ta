/*
  # Add Test Driver Packages

  1. Changes
    - Create test drivers
    - Create driver shifts
    - Generate driver packages with orders
    - Add package orders with proper sequences
    
  2. Implementation
    - Maintain data consistency
    - Generate realistic test data
    - Ensure proper relationships
*/

-- First create some test drivers if none exist
INSERT INTO drivers (
  driver_code,
  name,
  email,
  contact_number,
  license_number,
  vehicle_type,
  vehicle_number,
  status,
  created_at
)
SELECT
  code,
  name,
  email,
  contact_number,
  license_number,
  vehicle_type,
  vehicle_number,
  true,
  NOW()
FROM (
  VALUES
    (
      2001,
      'Jan de Vries',
      'jan@example.com',
      '+31612345001',
      'NL123456789',
      'van',
      'VN-123-A',
      true
    ),
    (
      2002,
      'Emma Bakker',
      'emma@example.com',
      '+31612345002',
      'NL987654321',
      'van',
      'VN-456-B',
      true
    ),
    (
      2003,
      'Lucas Jansen',
      'lucas@example.com',
      '+31612345003',
      'NL456789123',
      'van',
      'VN-789-C',
      true
    )
) AS d(code, name, email, contact_number, license_number, vehicle_type, vehicle_number, status)
WHERE NOT EXISTS (
  SELECT 1 FROM drivers WHERE status = true
);

-- Assign drivers to facilities
INSERT INTO facility_drivers (
  facility_id,
  driver_id
)
SELECT 
  f.id,
  d.id
FROM facilities f
CROSS JOIN drivers d
WHERE f.status = true
AND d.status = true
AND NOT EXISTS (
  SELECT 1 
  FROM facility_drivers fd 
  WHERE fd.facility_id = f.id 
  AND fd.driver_id = d.id
);

-- Create driver shifts for the next 7 days
INSERT INTO driver_shifts (
  driver_id,
  start_time,
  end_time,
  status
)
SELECT 
  d.id,
  date_shift + '09:00'::time,
  date_shift + '17:00'::time,
  'ongoing'
FROM drivers d
CROSS JOIN (
  SELECT generate_series(
    NOW()::date,
    (NOW() + interval '7 days')::date,
    interval '1 day'
  ) AS date_shift
) dates
WHERE d.status = true;

-- Create driver packages for processing orders
WITH processing_orders AS (
  SELECT 
    o.id as order_id,
    o.facility_id,
    o.estimated_delivery::date as delivery_date,
    o.estimated_delivery::time as delivery_time,
    ROW_NUMBER() OVER (
      PARTITION BY o.facility_id, o.estimated_delivery::date 
      ORDER BY o.estimated_delivery
    ) as order_sequence,
    CEIL(ROW_NUMBER() OVER (
      PARTITION BY o.facility_id, o.estimated_delivery::date 
      ORDER BY o.estimated_delivery
    ) / 15.0) as package_group
  FROM orders o
  WHERE o.status = 'processing'
  AND o.assigned_driver_id IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM package_orders po WHERE po.order_id = o.id
  )
),
package_groups AS (
  SELECT DISTINCT
    facility_id,
    delivery_date,
    package_group,
    COUNT(*) OVER (
      PARTITION BY facility_id, delivery_date, package_group
    ) as order_count
  FROM processing_orders
)
INSERT INTO driver_packages (
  driver_id,
  facility_id,
  package_date,
  start_time,
  end_time,
  total_orders,
  status,
  route_overview
)
SELECT 
  d.id,
  pg.facility_id,
  pg.delivery_date,
  '09:00'::time,
  '17:00'::time,
  pg.order_count,
  'assigned',
  jsonb_build_object(
    'start_location', 'Facility',
    'end_location', 'Facility',
    'total_distance', floor(random() * 50 + 10)
  )
FROM package_groups pg
CROSS JOIN LATERAL (
  SELECT d.id
  FROM drivers d
  JOIN facility_drivers fd ON fd.driver_id = d.id
  WHERE fd.facility_id = pg.facility_id
  AND d.status = true
  AND NOT EXISTS (
    SELECT 1 FROM driver_packages dp
    WHERE dp.driver_id = d.id
    AND dp.package_date = pg.delivery_date
  )
  ORDER BY random()
  LIMIT 1
) d;

-- Create package orders and update order assignments in a single transaction
DO $$
DECLARE
  r RECORD;
  v_package_id uuid;
BEGIN
  FOR r IN (
    SELECT 
      o.id as order_id,
      o.facility_id,
      o.estimated_delivery::date as delivery_date,
      o.estimated_delivery::time as delivery_time,
      ROW_NUMBER() OVER (
        PARTITION BY o.facility_id, o.estimated_delivery::date 
        ORDER BY o.estimated_delivery
      ) as order_sequence
    FROM orders o
    WHERE o.status = 'processing'
    AND o.assigned_driver_id IS NULL
    AND NOT EXISTS (
      SELECT 1 FROM package_orders po WHERE po.order_id = o.id
    )
  ) LOOP
    -- Find appropriate package
    SELECT dp.id
    INTO v_package_id
    FROM driver_packages dp
    WHERE dp.facility_id = r.facility_id
    AND dp.package_date = r.delivery_date
    AND (
      SELECT COUNT(*)
      FROM package_orders po
      WHERE po.package_id = dp.id
    ) < 15
    ORDER BY (
      SELECT COUNT(*)
      FROM package_orders po
      WHERE po.package_id = dp.id
    ) ASC
    LIMIT 1
    FOR UPDATE;

    -- Insert package order if we found a package
    IF v_package_id IS NOT NULL THEN
      INSERT INTO package_orders (
        package_id,
        order_id,
        sequence_number,
        estimated_arrival,
        status
      ) VALUES (
        v_package_id,
        r.order_id,
        r.order_sequence,
        r.delivery_time,
        'pending'
      );

      -- Update order with driver assignment
      UPDATE orders
      SET assigned_driver_id = (
        SELECT driver_id 
        FROM driver_packages 
        WHERE id = v_package_id
      )
      WHERE id = r.order_id;
    END IF;
  END LOOP;
END $$;

-- Add package logs
INSERT INTO package_logs (
  package_id,
  event_type,
  details
)
SELECT 
  dp.id,
  'package_created',
  jsonb_build_object(
    'driver_name', d.name,
    'facility_name', f.facility_name,
    'order_count', dp.total_orders
  )
FROM driver_packages dp
JOIN drivers d ON d.id = dp.driver_id
JOIN facilities f ON f.id = dp.facility_id;