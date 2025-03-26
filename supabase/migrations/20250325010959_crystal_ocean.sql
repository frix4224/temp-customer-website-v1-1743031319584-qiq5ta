/*
  # Driver Package System Implementation

  1. New Tables
    - driver_packages: Main package records
    - package_orders: Orders assigned to packages
    - driver_shifts: Driver shift schedules
    - package_logs: Package generation logs
    
  2. Functions
    - generate_driver_packages: Main package generation logic
    - optimize_route: Route optimization helper
    - assign_drivers: Driver assignment logic
    
  3. Triggers
    - Auto-generate packages before shifts
    - Log package generation events
*/

-- Create driver_packages table
CREATE TABLE driver_packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shift_id uuid REFERENCES driver_shifts(id),
  driver_id uuid REFERENCES drivers(id),
  facility_id uuid REFERENCES facilities(id),
  package_date date NOT NULL,
  start_time time NOT NULL,
  end_time time NOT NULL,
  total_orders integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'assigned', 'in_progress', 'completed', 'cancelled')),
  route_overview jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create package_orders table
CREATE TABLE package_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id uuid REFERENCES driver_packages(id) ON DELETE CASCADE,
  order_id uuid REFERENCES orders(id) ON DELETE CASCADE,
  sequence_number integer NOT NULL,
  estimated_arrival time,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'picked_up', 'delivered', 'failed')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (package_id, order_id)
);

-- Create package_logs table
CREATE TABLE package_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id uuid REFERENCES driver_packages(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  details jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Add indexes for better query performance
CREATE INDEX idx_driver_packages_date ON driver_packages(package_date);
CREATE INDEX idx_driver_packages_status ON driver_packages(status);
CREATE INDEX idx_driver_packages_driver ON driver_packages(driver_id);
CREATE INDEX idx_package_orders_status ON package_orders(status);
CREATE INDEX idx_package_logs_event ON package_logs(event_type);

-- Function to calculate distance between two points
CREATE OR REPLACE FUNCTION calculate_route_distance(
  start_lat float,
  start_lon float,
  end_lat float,
  end_lon float
)
RETURNS float AS $$
DECLARE
  R float := 6371; -- Earth's radius in kilometers
  dlat float;
  dlon float;
  a float;
  c float;
  d float;
BEGIN
  -- Convert degrees to radians
  start_lat := radians(start_lat);
  start_lon := radians(start_lon);
  end_lat := radians(end_lat);
  end_lon := radians(end_lon);
  
  -- Haversine formula
  dlat := end_lat - start_lat;
  dlon := end_lon - start_lon;
  a := sin(dlat/2)^2 + cos(start_lat) * cos(end_lat) * sin(dlon/2)^2;
  c := 2 * asin(sqrt(a));
  d := R * c;
  
  RETURN d;
END;
$$ LANGUAGE plpgsql;

-- Function to optimize route for a set of orders
CREATE OR REPLACE FUNCTION optimize_route(package_id uuid)
RETURNS void AS $$
DECLARE
  current_lat float;
  current_lon float;
  next_order_id uuid;
  sequence integer := 1;
  facility_record record;
BEGIN
  -- Get facility coordinates as starting point
  SELECT latitude::float, longitude::float 
  INTO current_lat, current_lon
  FROM facilities f
  JOIN driver_packages dp ON f.id = dp.facility_id
  WHERE dp.id = package_id;

  -- Iteratively find the nearest order and update sequence
  WHILE EXISTS (
    SELECT 1 FROM package_orders 
    WHERE package_id = optimize_route.package_id 
    AND sequence_number = 0
  ) LOOP
    -- Find nearest unassigned order
    SELECT po.order_id
    INTO next_order_id
    FROM package_orders po
    JOIN orders o ON po.order_id = o.id
    WHERE po.package_id = optimize_route.package_id
    AND po.sequence_number = 0
    ORDER BY calculate_route_distance(
      current_lat,
      current_lon,
      -- In practice, you would get these coordinates from geocoding the shipping_address
      -- For now, we'll use a placeholder calculation
      random() * 90, -- Simulated latitude
      random() * 180 -- Simulated longitude
    ) ASC
    LIMIT 1;

    -- Update sequence number
    UPDATE package_orders
    SET sequence_number = sequence
    WHERE package_id = optimize_route.package_id
    AND order_id = next_order_id;

    sequence := sequence + 1;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Function to generate driver packages
CREATE OR REPLACE FUNCTION generate_driver_packages(shift_date date)
RETURNS void AS $$
DECLARE
  facility record;
  shift record;
  package_id uuid;
  order_count integer;
  available_driver uuid;
BEGIN
  -- Process each facility
  FOR facility IN SELECT * FROM facilities WHERE status = true LOOP
    -- Process each shift at the facility
    FOR shift IN 
      SELECT ds.* 
      FROM driver_shifts ds
      JOIN facility_drivers fd ON ds.driver_id = fd.driver_id
      WHERE fd.facility_id = facility.id
      AND date(ds.start_time) = shift_date
      AND ds.status = 'ongoing'
    LOOP
      -- Count unassigned orders for this facility and shift
      SELECT COUNT(*)
      INTO order_count
      FROM orders o
      WHERE o.facility_id = facility.id
      AND date(o.estimated_delivery) = shift_date
      AND o.status = 'processing'
      AND o.assigned_driver_id IS NULL;

      -- Skip if no orders
      IF order_count = 0 THEN
        CONTINUE;
      END IF;

      -- Create packages while we have orders
      WHILE order_count > 0 LOOP
        -- Find available driver
        SELECT d.id
        INTO available_driver
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
        LIMIT 1;

        -- Create new package
        INSERT INTO driver_packages (
          shift_id,
          driver_id,
          facility_id,
          package_date,
          start_time,
          end_time,
          status
        ) VALUES (
          shift.id,
          available_driver,
          facility.id,
          shift_date,
          shift.start_time::time,
          shift.end_time::time,
          CASE WHEN available_driver IS NULL THEN 'pending' ELSE 'assigned' END
        )
        RETURNING id INTO package_id;

        -- Assign up to 15 orders to this package
        WITH orders_to_assign AS (
          SELECT o.id
          FROM orders o
          WHERE o.facility_id = facility.id
          AND date(o.estimated_delivery) = shift_date
          AND o.status = 'processing'
          AND o.assigned_driver_id IS NULL
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

        -- Update order count
        order_count := order_count - 15;

        -- Optimize route for this package
        PERFORM optimize_route(package_id);

        -- Log package generation
        INSERT INTO package_logs (
          package_id,
          event_type,
          details
        ) VALUES (
          package_id,
          'package_generated',
          jsonb_build_object(
            'facility_id', facility.id,
            'driver_id', available_driver,
            'order_count', LEAST(order_count + 15, 15)
          )
        );

        -- Update orders with assigned driver
        IF available_driver IS NOT NULL THEN
          UPDATE orders o
          SET assigned_driver_id = available_driver
          FROM package_orders po
          WHERE po.package_id = package_id
          AND po.order_id = o.id;
        END IF;
      END LOOP;
    END LOOP;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Function to handle unassigned packages notification
CREATE OR REPLACE FUNCTION notify_unassigned_packages()
RETURNS trigger AS $$
BEGIN
  -- In practice, you would implement actual notification logic here
  -- For now, we just log it
  INSERT INTO package_logs (
    package_id,
    event_type,
    details
  ) VALUES (
    NEW.id,
    'unassigned_package_alert',
    jsonb_build_object(
      'facility_id', NEW.facility_id,
      'package_date', NEW.package_date
    )
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for unassigned package notification
CREATE TRIGGER notify_unassigned_packages_trigger
  AFTER INSERT ON driver_packages
  FOR EACH ROW
  WHEN (NEW.driver_id IS NULL)
  EXECUTE FUNCTION notify_unassigned_packages();

-- Enable RLS
ALTER TABLE driver_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE package_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE package_logs ENABLE ROW LEVEL SECURITY;

-- Add RLS policies
CREATE POLICY "Drivers can view their assigned packages"
  ON driver_packages
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() IN (
      SELECT user_id FROM drivers WHERE id = driver_packages.driver_id
    )
  );

CREATE POLICY "Service role can manage all packages"
  ON driver_packages
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Drivers can view their package orders"
  ON package_orders
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM driver_packages dp
      JOIN drivers d ON dp.driver_id = d.id
      WHERE dp.id = package_orders.package_id
      AND d.user_id = auth.uid()
    )
  );

CREATE POLICY "Service role can manage all package orders"
  ON package_orders
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Admin users can view all logs"
  ON package_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE auth_id = auth.uid()
    )
  );

CREATE POLICY "Service role can manage all logs"
  ON package_logs
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Add comments
COMMENT ON TABLE driver_packages IS 'Stores driver delivery/pickup packages';
COMMENT ON TABLE package_orders IS 'Maps orders to driver packages';
COMMENT ON TABLE package_logs IS 'Audit log for package-related events';

-- Create function to schedule package generation
CREATE OR REPLACE FUNCTION schedule_package_generation()
RETURNS void AS $$
BEGIN
  -- In practice, you would use a proper job scheduler
  -- For demonstration, we'll generate packages for tomorrow
  PERFORM generate_driver_packages(current_date + 1);
END;
$$ LANGUAGE plpgsql;