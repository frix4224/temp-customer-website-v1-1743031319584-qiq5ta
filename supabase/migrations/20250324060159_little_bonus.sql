/*
  # Add Order-Driver Relationship

  1. Changes
    - Add assigned_driver_id column to orders table
    - Add foreign key constraint to drivers table
    - Add last_status_update column to orders table
    - Add type column for pickup/delivery
    
  2. Implementation
    - Add new columns with appropriate constraints
    - Add indexes for performance
    - Update existing orders with default values
*/

-- Add assigned_driver_id to orders
ALTER TABLE orders
ADD COLUMN assigned_driver_id uuid REFERENCES drivers(id),
ADD COLUMN last_status_update timestamptz DEFAULT now(),
ADD COLUMN type text CHECK (type IN ('pickup', 'delivery')) DEFAULT 'delivery';

-- Create index for assigned_driver lookups
CREATE INDEX idx_orders_assigned_driver ON orders(assigned_driver_id);

-- Add comment explaining the relationship
COMMENT ON COLUMN orders.assigned_driver_id IS 'Reference to the driver assigned to this order';
COMMENT ON COLUMN orders.last_status_update IS 'Timestamp of the last status change';
COMMENT ON COLUMN orders.type IS 'Type of order - pickup or delivery';

-- Create trigger to update last_status_update
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