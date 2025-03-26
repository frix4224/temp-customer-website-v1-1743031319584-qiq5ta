/*
  # Initial Schema Setup for Eazyy Admin Panel

  1. New Tables
    - services: Core laundry services
    - categories: Service categories
    - items: Individual laundry items
    - custom_price_quotes: Custom price requests
    - business_inquiries: Business partnership inquiries
    - orders: Customer orders
    - order_items: Items in each order
    - order_statuses: Order status tracking
    - roles: User role definitions
    - profiles: Extended user profiles

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated access
*/

-- Create tables if they don't exist
CREATE TABLE IF NOT EXISTS services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id uuid REFERENCES services(id) ON DELETE CASCADE,
  name text NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid REFERENCES categories(id) ON DELETE CASCADE,
  name text NOT NULL,
  price decimal(10,2) NOT NULL,
  description text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS custom_price_quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid,
  item_name text NOT NULL,
  image_url text,
  description text,
  suggested_price decimal(10,2),
  status text DEFAULT 'pending',
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS business_inquiries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL,
  phone text,
  company_name text,
  service_request text,
  message text,
  status text DEFAULT 'new',
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES auth.users(id),
  total_price decimal(10,2) NOT NULL,
  status text DEFAULT 'new',
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES orders(id) ON DELETE CASCADE,
  item_id uuid REFERENCES items(id),
  quantity integer NOT NULL,
  price decimal(10,2) NOT NULL
);

CREATE TABLE IF NOT EXISTS order_statuses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES orders(id) ON DELETE CASCADE,
  status text NOT NULL,
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role_name character varying(100) NOT NULL,
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name text,
  last_name text,
  phone text,
  address text,
  city text,
  postal_code text,
  preferences jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS on all tables
DO $$ 
BEGIN
  EXECUTE 'ALTER TABLE services ENABLE ROW LEVEL SECURITY';
  EXECUTE 'ALTER TABLE categories ENABLE ROW LEVEL SECURITY';
  EXECUTE 'ALTER TABLE items ENABLE ROW LEVEL SECURITY';
  EXECUTE 'ALTER TABLE custom_price_quotes ENABLE ROW LEVEL SECURITY';
  EXECUTE 'ALTER TABLE business_inquiries ENABLE ROW LEVEL SECURITY';
  EXECUTE 'ALTER TABLE orders ENABLE ROW LEVEL SECURITY';
  EXECUTE 'ALTER TABLE order_items ENABLE ROW LEVEL SECURITY';
  EXECUTE 'ALTER TABLE order_statuses ENABLE ROW LEVEL SECURITY';
  EXECUTE 'ALTER TABLE roles ENABLE ROW LEVEL SECURITY';
  EXECUTE 'ALTER TABLE profiles ENABLE ROW LEVEL SECURITY';
END $$;

-- Drop existing policies if they exist
DO $$ 
BEGIN
  -- Services policies
  DROP POLICY IF EXISTS "services_read_20250317" ON services;
  DROP POLICY IF EXISTS "services_all_20250317" ON services;
  
  -- Categories policies
  DROP POLICY IF EXISTS "categories_read_20250317" ON categories;
  
  -- Items policies
  DROP POLICY IF EXISTS "items_read_20250317" ON items;
  
  -- Custom price quotes policies
  DROP POLICY IF EXISTS "custom_price_quotes_read_20250317" ON custom_price_quotes;
  
  -- Business inquiries policies
  DROP POLICY IF EXISTS "business_inquiries_read_20250317" ON business_inquiries;
  
  -- Orders policies
  DROP POLICY IF EXISTS "orders_read_20250317" ON orders;
  
  -- Order items policies
  DROP POLICY IF EXISTS "order_items_read_20250317" ON order_items;
  
  -- Order statuses policies
  DROP POLICY IF EXISTS "order_statuses_read_20250317" ON order_statuses;
  
  -- Roles policies
  DROP POLICY IF EXISTS "roles_read_20250317" ON roles;
  
  -- Profiles policies
  DROP POLICY IF EXISTS "profiles_read_20250317" ON profiles;
  DROP POLICY IF EXISTS "profiles_update_20250317" ON profiles;
END $$;

-- Create new policies
CREATE POLICY "services_read_20250317" ON services
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "services_all_20250317" ON services
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "categories_read_20250317" ON categories
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "items_read_20250317" ON items
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "custom_price_quotes_read_20250317" ON custom_price_quotes
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "business_inquiries_read_20250317" ON business_inquiries
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "orders_read_20250317" ON orders
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "order_items_read_20250317" ON order_items
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "order_statuses_read_20250317" ON order_statuses
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "roles_read_20250317" ON roles
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "profiles_read_20250317" ON profiles
  FOR SELECT TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "profiles_update_20250317" ON profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Insert default admin role if it doesn't exist
INSERT INTO roles (role_name, description)
SELECT 'admin', 'Administrator with full system access'
WHERE NOT EXISTS (
  SELECT 1 FROM roles WHERE role_name = 'admin'
);

-- Create or replace trigger function for handling updated_at
CREATE OR REPLACE FUNCTION handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists and create new one
DROP TRIGGER IF EXISTS profiles_updated_at ON profiles;
CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();

-- Create trigger for roles
DROP TRIGGER IF EXISTS roles_updated_at ON roles;
CREATE TRIGGER roles_updated_at
  BEFORE UPDATE ON roles
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();