/*
  # Schema Update for Eazyy Platform

  1. Changes
    - Add IF NOT EXISTS to all table creation statements
    - Drop and recreate triggers and policies safely
    - Maintain all relationships and constraints
    
  2. Implementation
    - Use DO blocks to safely handle existing objects
    - Keep all functionality identical
*/

-- Drop existing triggers first to avoid conflicts
DO $$ 
BEGIN
  -- Drop triggers if they exist
  DROP TRIGGER IF EXISTS services_updated_at ON services;
  DROP TRIGGER IF EXISTS categories_updated_at ON categories;
  DROP TRIGGER IF EXISTS items_updated_at ON items;
  DROP TRIGGER IF EXISTS orders_updated_at ON orders;
  DROP TRIGGER IF EXISTS order_items_updated_at ON order_items;
  DROP TRIGGER IF EXISTS profiles_updated_at ON profiles;
  DROP TRIGGER IF EXISTS admin_users_updated_at ON admin_users;
  DROP TRIGGER IF EXISTS user_addresses_updated_at ON user_addresses;
  DROP TRIGGER IF EXISTS user_devices_updated_at ON user_devices;
  DROP TRIGGER IF EXISTS ensure_single_default_address_trigger ON user_addresses;
  DROP TRIGGER IF EXISTS generate_order_qr_code ON orders;
  DROP TRIGGER IF EXISTS order_state_transition_trigger ON orders;
  DROP TRIGGER IF EXISTS order_type_transition_trigger ON orders;
  DROP TRIGGER IF EXISTS update_order_status_timestamp ON orders;
  DROP TRIGGER IF EXISTS assign_facility_trigger ON orders;
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

-- Drop existing functions
DO $$
BEGIN
  DROP FUNCTION IF EXISTS handle_updated_at();
  DROP FUNCTION IF EXISTS ensure_single_default_address();
  DROP FUNCTION IF EXISTS handle_order_qr_code();
  DROP FUNCTION IF EXISTS handle_order_state_transition();
  DROP FUNCTION IF EXISTS handle_order_type_transition();
  DROP FUNCTION IF EXISTS update_order_status_timestamp();
  DROP FUNCTION IF EXISTS assign_nearest_facility();
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

-- Create trigger function for updated_at
CREATE OR REPLACE FUNCTION handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER services_updated_at
  BEFORE UPDATE ON services
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER categories_updated_at
  BEFORE UPDATE ON categories
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER items_updated_at
  BEFORE UPDATE ON items
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER order_items_updated_at
  BEFORE UPDATE ON order_items
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER admin_users_updated_at
  BEFORE UPDATE ON admin_users
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER user_addresses_updated_at
  BEFORE UPDATE ON user_addresses
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER user_devices_updated_at
  BEFORE UPDATE ON user_devices
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();

-- Add trigger for ensuring single default address
CREATE OR REPLACE FUNCTION ensure_single_default_address()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_default THEN
    UPDATE user_addresses
    SET is_default = false
    WHERE user_id = NEW.user_id
    AND id != NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ensure_single_default_address_trigger
  BEFORE INSERT OR UPDATE OF is_default ON user_addresses
  FOR EACH ROW
  WHEN (NEW.is_default = true)
  EXECUTE FUNCTION ensure_single_default_address();

-- Add trigger for order QR code generation
CREATE OR REPLACE FUNCTION handle_order_qr_code()
RETURNS TRIGGER AS $$
BEGIN
  NEW.qr_code = json_build_object(
    'order_number', NEW.order_number,
    'customer_name', NEW.customer_name,
    'total_amount', NEW.total_amount
  )::text;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER generate_order_qr_code
  BEFORE INSERT ON orders
  FOR EACH ROW
  EXECUTE FUNCTION handle_order_qr_code();

-- Add trigger for order state transitions
CREATE OR REPLACE FUNCTION handle_order_state_transition()
RETURNS TRIGGER AS $$
BEGIN
  -- Validate state transitions
  IF NEW.is_dropoff_completed AND NOT NEW.is_pickup_completed THEN
    RAISE EXCEPTION 'Order must be picked up before drop-off';
  END IF;

  IF NEW.is_facility_processing AND NOT NEW.is_pickup_completed THEN
    RAISE EXCEPTION 'Order must be picked up before facility processing';
  END IF;

  IF NEW.is_dropoff_completed AND NEW.is_facility_processing THEN
    RAISE EXCEPTION 'Order cannot be in facility processing after drop-off';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER order_state_transition_trigger
  BEFORE UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION handle_order_state_transition();

-- Add trigger for order type transitions
CREATE OR REPLACE FUNCTION handle_order_type_transition()
RETURNS TRIGGER AS $$
BEGIN
  -- Validate type transitions
  IF TG_OP = 'UPDATE' AND OLD.type != NEW.type AND (
    OLD.is_pickup_completed OR
    OLD.is_facility_processing OR
    OLD.is_dropoff_completed
  ) THEN
    RAISE EXCEPTION 'Cannot change order type after processing has begun';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER order_type_transition_trigger
  BEFORE INSERT OR UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION handle_order_type_transition();

-- Add trigger for order status timestamp
CREATE OR REPLACE FUNCTION update_order_status_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    NEW.last_status_update = now();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_order_status_timestamp
  BEFORE UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION update_order_status_timestamp();

-- Add trigger for facility assignment
CREATE OR REPLACE FUNCTION assign_nearest_facility()
RETURNS TRIGGER AS $$
DECLARE
  nearest_facility_id uuid;
BEGIN
  -- Find nearest facility based on coordinates and operating hours
  SELECT f.id
  INTO nearest_facility_id
  FROM facilities f
  WHERE f.status = true
    AND f.opening_hour <= NEW.estimated_delivery::time
    AND f.close_hour >= NEW.estimated_delivery::time
  ORDER BY 
    point(f.longitude::float, f.latitude::float) <-> 
    point(NEW.longitude::float, NEW.latitude::float)
  LIMIT 1;

  IF nearest_facility_id IS NULL THEN
    RAISE EXCEPTION 'No facility available for the specified delivery time';
  END IF;

  NEW.facility_id := nearest_facility_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER assign_facility_trigger
  BEFORE INSERT OR UPDATE OF shipping_address, estimated_delivery ON orders
  FOR EACH ROW
  EXECUTE FUNCTION assign_nearest_facility();

-- Drop existing policies
DO $$ 
BEGIN
  -- Drop policies if they exist
  DROP POLICY IF EXISTS "Public read access to services" ON services;
  DROP POLICY IF EXISTS "Public read access to categories" ON categories;
  DROP POLICY IF EXISTS "Public read access to items" ON items;
  DROP POLICY IF EXISTS "Users can read own orders" ON orders;
  DROP POLICY IF EXISTS "Users can read own order items" ON order_items;
  DROP POLICY IF EXISTS "Users can read own status logs" ON order_status_logs;
  DROP POLICY IF EXISTS "Users can read own quotes" ON custom_price_quotes;
  DROP POLICY IF EXISTS "Users can create business inquiries" ON business_inquiries;
  DROP POLICY IF EXISTS "Users can read own business inquiries" ON business_inquiries;
  DROP POLICY IF EXISTS "Drivers can read own data" ON drivers;
  DROP POLICY IF EXISTS "Drivers can read own shifts" ON driver_shifts;
  DROP POLICY IF EXISTS "Drivers can view assigned packages" ON driver_packages;
  DROP POLICY IF EXISTS "Drivers can view package orders" ON package_orders;
  DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
  DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
  DROP POLICY IF EXISTS "Admin users can read own data" ON admin_users;
  DROP POLICY IF EXISTS "Users can manage their addresses" ON user_addresses;
  DROP POLICY IF EXISTS "Users can manage their devices" ON user_devices;
  DROP POLICY IF EXISTS "Users can create scans" ON scans;
  DROP POLICY IF EXISTS "Users can read scans they created" ON scans;
  DROP POLICY IF EXISTS "Service role can do everything" ON services;
  DROP POLICY IF EXISTS "Service role can do everything with categories" ON categories;
  DROP POLICY IF EXISTS "Service role can do everything with items" ON items;
  DROP POLICY IF EXISTS "Service role can do everything with orders" ON orders;
  DROP POLICY IF EXISTS "Service role can do everything with order items" ON order_items;
  DROP POLICY IF EXISTS "Service role can do everything with status logs" ON order_status_logs;
  DROP POLICY IF EXISTS "Service role can do everything with quotes" ON custom_price_quotes;
  DROP POLICY IF EXISTS "Service role can do everything with inquiries" ON business_inquiries;
  DROP POLICY IF EXISTS "Service role can do everything with drivers" ON drivers;
  DROP POLICY IF EXISTS "Service role can do everything with shifts" ON driver_shifts;
  DROP POLICY IF EXISTS "Service role can do everything with packages" ON driver_packages;
  DROP POLICY IF EXISTS "Service role can do everything with package orders" ON package_orders;
  DROP POLICY IF EXISTS "Service role can do everything with facilities" ON facilities;
  DROP POLICY IF EXISTS "Service role can do everything with facility drivers" ON facility_drivers;
  DROP POLICY IF EXISTS "Service role can do everything with profiles" ON profiles;
  DROP POLICY IF EXISTS "Service role can do everything with admin users" ON admin_users;
  DROP POLICY IF EXISTS "Service role can do everything with user addresses" ON user_addresses;
  DROP POLICY IF EXISTS "Service role can do everything with user devices" ON user_devices;
  DROP POLICY IF EXISTS "Service role can do everything with scans" ON scans;
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

-- Add RLS policies
CREATE POLICY "Public read access to services"
  ON services FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Public read access to categories"
  ON categories FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Public read access to items"
  ON items FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Users can read own orders"
  ON orders FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can read own order items"
  ON order_items FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM orders
    WHERE orders.id = order_items.order_id
    AND orders.user_id = auth.uid()
  ));

CREATE POLICY "Users can read own status logs"
  ON order_status_logs FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM orders
    WHERE orders.id = order_status_logs.order_id
    AND orders.user_id = auth.uid()
  ));

CREATE POLICY "Users can read own quotes"
  ON custom_price_quotes FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can create business inquiries"
  ON business_inquiries FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can read own business inquiries"
  ON business_inquiries FOR SELECT
  TO authenticated
  USING (email = auth.email());

CREATE POLICY "Drivers can read own data"
  ON drivers FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Drivers can read own shifts"
  ON driver_shifts FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM drivers
    WHERE drivers.id = driver_shifts.driver_id
    AND drivers.user_id = auth.uid()
  ));

CREATE POLICY "Drivers can view assigned packages"
  ON driver_packages FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM drivers
    WHERE drivers.id = driver_packages.driver_id
    AND drivers.user_id = auth.uid()
  ));

CREATE POLICY "Drivers can view package orders"
  ON package_orders FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM driver_packages dp
    JOIN drivers d ON dp.driver_id = d.id
    WHERE dp.id = package_orders.package_id
    AND d.user_id = auth.uid()
  ));

CREATE POLICY "Users can read own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (id = auth.uid());

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

CREATE POLICY "Admin users can read own data"
  ON admin_users FOR SELECT
  TO authenticated
  USING (auth_id = auth.uid());

CREATE POLICY "Users can manage their addresses"
  ON user_addresses FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can manage their devices"
  ON user_devices FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can create scans"
  ON scans FOR INSERT
  TO authenticated
  WITH CHECK (scanned_by = auth.uid());

CREATE POLICY "Users can read scans they created"
  ON scans FOR SELECT
  TO authenticated
  USING (scanned_by = auth.uid());

-- Add service role policies
CREATE POLICY "Service role can do everything"
  ON services FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role can do everything with categories"
  ON categories FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role can do everything with items"
  ON items FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role can do everything with orders"
  ON orders FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role can do everything with order items"
  ON order_items FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role can do everything with status logs"
  ON order_status_logs FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role can do everything with quotes"
  ON custom_price_quotes FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role can do everything with inquiries"
  ON business_inquiries FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role can do everything with drivers"
  ON drivers FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role can do everything with shifts"
  ON driver_shifts FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role can do everything with packages"
  ON driver_packages FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role can do everything with package orders"
  ON package_orders FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role can do everything with facilities"
  ON facilities FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role can do everything with facility drivers"
  ON facility_drivers FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role can do everything with profiles"
  ON profiles FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role can do everything with admin users"
  ON admin_users FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role can do everything with user addresses"
  ON user_addresses FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role can do everything with user devices"
  ON user_devices FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role can do everything with scans"
  ON scans FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);