/*
  # Add Custom Price Option to Items

  1. Changes
    - Add is_custom_price column if it doesn't exist
    - Make price column nullable
    - Set default value for is_custom_price
    
  2. Implementation
    - Use DO block to check column existence
    - Safely alter price column
*/

-- Add is_custom_price column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'items' 
    AND column_name = 'is_custom_price'
  ) THEN
    ALTER TABLE items
    ADD COLUMN is_custom_price boolean DEFAULT false;
  END IF;
END $$;

-- Make price column nullable if it isn't already
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'items' 
    AND column_name = 'price' 
    AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE items
    ALTER COLUMN price DROP NOT NULL;
  END IF;
END $$;

-- Ensure default value for is_custom_price
ALTER TABLE items
ALTER COLUMN is_custom_price SET DEFAULT false;