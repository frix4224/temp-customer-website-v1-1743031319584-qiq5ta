/*
  # Add name column to service_categories table

  1. Changes
    - Add name column to service_categories table
    - Set default name for any existing records
    - Make name column required
    
  2. Implementation Strategy
    - Add column as nullable first
    - Update existing records with a default name
    - Add NOT NULL constraint
*/

-- Add name column as nullable first
ALTER TABLE service_categories 
ADD COLUMN IF NOT EXISTS name text;

-- Update any existing records with a default name
UPDATE service_categories 
SET name = 'Category ' || id::text
WHERE name IS NULL;

-- Now make the column NOT NULL
ALTER TABLE service_categories 
ALTER COLUMN name SET NOT NULL;