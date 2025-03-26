/*
  # Ensure Unique Items Per Category

  1. Changes
    - Add unique constraint for item names within categories
    - Clean up any duplicate items
    - Add comment explaining the constraint
    
  2. Implementation
    - Remove duplicate items, keeping the first one created
    - Add unique constraint using a standard index
    - Add documentation
*/

-- First, remove any duplicate items, keeping the first one created
WITH duplicates AS (
  SELECT id,
         ROW_NUMBER() OVER (
           PARTITION BY category_id, name
           ORDER BY created_at
         ) as row_num
  FROM items
)
DELETE FROM items
WHERE id IN (
  SELECT id 
  FROM duplicates 
  WHERE row_num > 1
);

-- Add unique constraint for item names within categories
ALTER TABLE items
DROP CONSTRAINT IF EXISTS unique_item_name_per_category;

CREATE UNIQUE INDEX unique_item_name_per_category 
ON items (category_id, name);

ALTER TABLE items
ADD CONSTRAINT unique_item_name_per_category 
UNIQUE USING INDEX unique_item_name_per_category;

-- Add comment explaining the constraint
COMMENT ON CONSTRAINT unique_item_name_per_category ON items IS 
  'Ensures each item name is unique within its category';