/*
  # Fix Services and Categories Schema

  1. Changes
    - Create services table with all required fields
    - Create categories table with proper structure
    - Add RLS policies
    - Add sample data
    
  2. Security
    - Enable RLS on both tables
    - Add policies for public read access
    - Add policies for service role management
*/

-- Drop existing tables if they exist
DROP TABLE IF EXISTS items CASCADE;
DROP TABLE IF EXISTS categories CASCADE;
DROP TABLE IF EXISTS services CASCADE;

-- Create services table
CREATE TABLE services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  short_description text NOT NULL,
  icon text NOT NULL,
  image_url text,
  price_starts_at numeric(10,2) NOT NULL,
  price_unit text NOT NULL,
  features text[] NOT NULL DEFAULT '{}',
  benefits text[] NOT NULL DEFAULT '{}',
  service_identifier text NOT NULL,
  color_scheme jsonb NOT NULL DEFAULT '{"primary": "blue", "secondary": "blue-light"}'::jsonb,
  sequence integer NOT NULL DEFAULT 0,
  is_popular boolean NOT NULL DEFAULT false,
  status boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create categories table
CREATE TABLE categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id uuid REFERENCES services(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  icon text,
  sequence integer NOT NULL DEFAULT 0,
  status boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create items table
CREATE TABLE items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid REFERENCES categories(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  price numeric(10,2) NOT NULL,
  is_popular boolean NOT NULL DEFAULT false,
  sequence integer NOT NULL DEFAULT 0,
  status boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create trigger for services updated_at
CREATE TRIGGER services_updated_at
  BEFORE UPDATE ON services
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();

-- Create trigger for categories updated_at
CREATE TRIGGER categories_updated_at
  BEFORE UPDATE ON categories
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();

-- Create trigger for items updated_at
CREATE TRIGGER items_updated_at
  BEFORE UPDATE ON items
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();

-- Enable RLS
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE items ENABLE ROW LEVEL SECURITY;

-- Add RLS policies for services
CREATE POLICY "services_read_public_20250324"
  ON services
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "services_service_role_20250324"
  ON services
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Add RLS policies for categories
CREATE POLICY "categories_read_public_20250324"
  ON categories
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "categories_service_role_20250324"
  ON categories
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Add RLS policies for items
CREATE POLICY "items_read_public_20250324"
  ON items
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "items_service_role_20250324"
  ON items
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Insert sample services
INSERT INTO services (
  name,
  description,
  short_description,
  icon,
  price_starts_at,
  price_unit,
  features,
  benefits,
  service_identifier,
  sequence
) VALUES
(
  'Regular Laundry',
  'Standard washing and drying services for everyday clothes',
  'Professional washing and drying',
  'washing-machine',
  9.99,
  'per kg',
  ARRAY['Wash & Fold', 'Stain Treatment', 'Fabric Softener'],
  ARRAY['Fresh & Clean', 'Professional Care', 'Quick Service'],
  'regular-laundry',
  1
),
(
  'Dry Cleaning',
  'Professional dry cleaning services for delicate garments',
  'Expert care for delicate items',
  'shirt',
  14.99,
  'per item',
  ARRAY['Spot Treatment', 'Pressing', 'Packaging'],
  ARRAY['Safe for Delicates', 'Expert Handling', 'Premium Service'],
  'dry-cleaning',
  2
),
(
  'Repairs & Alterations',
  'Professional clothing repair and alteration services',
  'Custom fits and repairs',
  'scissors',
  19.99,
  'per service',
  ARRAY['Hemming', 'Zipper Repair', 'Button Replacement'],
  ARRAY['Perfect Fit', 'Expert Tailoring', 'Quick Turnaround'],
  'repairs-alterations',
  3
);