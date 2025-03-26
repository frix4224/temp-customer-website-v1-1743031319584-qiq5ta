/*
  # Fix Orders-Drivers Relationship

  1. Changes
    - Drop and recreate foreign key constraint
    - Add proper indexes
    - Update existing data
    - Add validation triggers
    
  2. Security
    - Maintain data integrity
    - Add proper documentation
*/

-- First ensure the assigned_driver_id column exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'orders' 
    AND column_name = 'assigned_driver_id'
  ) THEN
    ALTER TABLE orders
    ADD COLUMN assigned_driver_id uuid REFERENCES drivers(id);
  END IF;
END $$;

-- Drop existing foreign key if it exists
ALTER TABLE orders
DROP CONSTRAINT IF EXISTS orders_assigned_driver_id_fkey;

-- Drop existing index if it exists
DROP INDEX IF EXISTS idx_orders_assigned_driver;

-- Recreate the foreign key with the correct name
ALTER TABLE orders
ADD CONSTRAINT orders_assigned_driver_id_fkey 
FOREIGN KEY (assigned_driver_id) 
REFERENCES drivers(id);

-- Create index for better query performance
CREATE INDEX idx_orders_assigned_driver 
ON orders(assigned_driver_id);

-- Add comment explaining the relationship
COMMENT ON COLUMN orders.assigned_driver_id IS 
  'Reference to the driver assigned to this order';

-- Add trigger to validate driver status when assigning orders
CREATE OR REPLACE FUNCTION validate_driver_status()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.assigned_driver_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM drivers 
      WHERE id = NEW.assigned_driver_id 
      AND status = true
    ) THEN
      RAISE EXCEPTION 'Orders can only be assigned to active drivers';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_active_driver
  BEFORE INSERT OR UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION validate_driver_status();