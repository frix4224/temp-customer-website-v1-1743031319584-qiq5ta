/*
  # Add service_id to categories table

  1. Changes
    - Add service_id column to categories table (initially nullable)
    - Add foreign key constraint to services table
    - Add index for better query performance
    - Make column NOT NULL after setting default values
    
  2. Implementation
    - Add column as nullable first
    - Set values for existing records
    - Then add NOT NULL constraint
*/

-- Add service_id column as nullable first
ALTER TABLE categories
ADD COLUMN service_id uuid REFERENCES services(id) ON DELETE CASCADE;

-- Get first service id as default (temporary solution)
DO $$
DECLARE
  default_service_id uuid;
BEGIN
  -- Get the first service id
  SELECT id INTO default_service_id FROM services ORDER BY created_at LIMIT 1;
  
  -- Update existing categories to use this service_id
  IF default_service_id IS NOT NULL THEN
    UPDATE categories SET service_id = default_service_id WHERE service_id IS NULL;
  END IF;
END $$;

-- Now make the column NOT NULL
ALTER TABLE categories
ALTER COLUMN service_id SET NOT NULL;

-- Create index for better performance
CREATE INDEX idx_categories_service_id ON categories(service_id);

-- Add comment explaining the relationship
COMMENT ON COLUMN categories.service_id IS 
  'Reference to the service this category belongs to';