/*
  # Fix Order-Driver Relationship

  1. Changes
    - Drop and recreate foreign key with correct name
    - Add proper indexes and constraints
    - Handle existing constraints safely
    
  2. Implementation
    - Use IF EXISTS checks for safety
    - Maintain data integrity
    - Add proper documentation
*/

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

-- Ensure last_status_update is set
UPDATE orders 
SET last_status_update = created_at 
WHERE last_status_update IS NULL;

ALTER TABLE orders 
ALTER COLUMN last_status_update 
SET DEFAULT now();

-- Ensure type has a valid value
UPDATE orders 
SET type = 'delivery' 
WHERE type IS NULL;

ALTER TABLE orders 
ALTER COLUMN type 
SET DEFAULT 'delivery';

-- Drop existing type check constraint if it exists
ALTER TABLE orders
DROP CONSTRAINT IF EXISTS orders_type_check;

-- Add check constraint for type
ALTER TABLE orders 
ADD CONSTRAINT orders_type_check 
CHECK (type IN ('pickup', 'delivery'));