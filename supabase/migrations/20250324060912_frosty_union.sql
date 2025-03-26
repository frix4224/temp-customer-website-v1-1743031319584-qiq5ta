/*
  # Add Facility Assignment Logic

  1. Changes
    - Add facility_id column to orders table
    - Add function to calculate distance between coordinates
    - Add function to find nearest facility
    - Add trigger to automatically assign facility
    
  2. Implementation
    - Use point type for coordinates
    - Calculate distance using Haversine formula
    - Consider facility operating hours and status
*/

-- First ensure the facility_id column exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'orders' 
    AND column_name = 'facility_id'
  ) THEN
    ALTER TABLE orders
    ADD COLUMN facility_id uuid REFERENCES facilities(id);
  END IF;
END $$;

-- Create index for facility lookups
CREATE INDEX IF NOT EXISTS idx_orders_facility 
ON orders(facility_id);

-- Add comment explaining the relationship
COMMENT ON COLUMN orders.facility_id IS 
  'Reference to the facility handling this order';

-- Create function to calculate distance between two points
CREATE OR REPLACE FUNCTION calculate_distance(
  lat1 float,
  lon1 float,
  lat2 float,
  lon2 float
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
  lat1 := radians(lat1);
  lon1 := radians(lon1);
  lat2 := radians(lat2);
  lon2 := radians(lon2);
  
  -- Haversine formula
  dlat := lat2 - lat1;
  dlon := lon2 - lon1;
  a := sin(dlat/2)^2 + cos(lat1) * cos(lat2) * sin(dlon/2)^2;
  c := 2 * asin(sqrt(a));
  d := R * c;
  
  RETURN d;
END;
$$ LANGUAGE plpgsql;

-- Create function to find nearest facility
CREATE OR REPLACE FUNCTION find_nearest_facility(
  order_lat float,
  order_lon float,
  delivery_time timestamptz
)
RETURNS uuid AS $$
DECLARE
  nearest_facility_id uuid;
  delivery_time_only time := delivery_time::time;
BEGIN
  -- Find the nearest active facility that's open during delivery time
  SELECT f.id
  INTO nearest_facility_id
  FROM facilities f
  WHERE f.status = true
    AND f.opening_hour <= delivery_time_only
    AND f.close_hour >= delivery_time_only
  ORDER BY calculate_distance(
    order_lat,
    order_lon,
    f.latitude::float,
    f.longitude::float
  )
  LIMIT 1;
  
  RETURN nearest_facility_id;
END;
$$ LANGUAGE plpgsql;

-- Create trigger function to assign nearest facility
CREATE OR REPLACE FUNCTION assign_nearest_facility()
RETURNS TRIGGER AS $$
DECLARE
  shipping_lat float;
  shipping_lon float;
BEGIN
  -- Here you would need to implement geocoding to get coordinates
  -- from shipping_address, but for now we'll use placeholder logic
  -- You can integrate with a geocoding service in your application code
  
  -- For demonstration, we'll use the first active facility if coordinates
  -- cannot be determined
  IF shipping_lat IS NULL OR shipping_lon IS NULL THEN
    SELECT id INTO NEW.facility_id
    FROM facilities
    WHERE status = true
    LIMIT 1;
  ELSE
    NEW.facility_id := find_nearest_facility(
      shipping_lat,
      shipping_lon,
      NEW.estimated_delivery
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically assign facility
DROP TRIGGER IF EXISTS assign_facility_trigger ON orders;

CREATE TRIGGER assign_facility_trigger
  BEFORE INSERT OR UPDATE OF shipping_address, estimated_delivery
  ON orders
  FOR EACH ROW
  EXECUTE FUNCTION assign_nearest_facility();

-- Add index for facility coordinates
CREATE INDEX IF NOT EXISTS idx_facilities_coordinates 
ON facilities(latitude, longitude);

-- Add index for facility operating hours
CREATE INDEX IF NOT EXISTS idx_facilities_hours 
ON facilities(opening_hour, close_hour);