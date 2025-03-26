/*
  # Limit Categories to 3 Items Each

  1. Changes
    - Keep only the top 3 items per category based on sequence
    - Add trigger to enforce max 3 items per category
    
  2. Implementation
    - Delete excess items keeping only top 3 by sequence
    - Create trigger to prevent adding more than 3 items
*/

-- First, delete excess items keeping only top 3 per category
WITH ranked_items AS (
  SELECT 
    id,
    category_id,
    ROW_NUMBER() OVER (PARTITION BY category_id ORDER BY sequence, created_at) as item_rank
  FROM items
)
DELETE FROM items
WHERE id IN (
  SELECT id 
  FROM ranked_items 
  WHERE item_rank > 3
);

-- Create function to check number of items in category
CREATE OR REPLACE FUNCTION check_category_item_limit()
RETURNS TRIGGER AS $$
BEGIN
  IF (
    SELECT COUNT(*) 
    FROM items 
    WHERE category_id = NEW.category_id
  ) >= 3 THEN
    RAISE EXCEPTION 'Categories cannot have more than 3 items';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to enforce item limit
CREATE TRIGGER enforce_category_item_limit
  BEFORE INSERT ON items
  FOR EACH ROW
  EXECUTE FUNCTION check_category_item_limit();

-- Add comment explaining the constraint
COMMENT ON FUNCTION check_category_item_limit() IS 
  'Ensures categories cannot have more than 3 items';