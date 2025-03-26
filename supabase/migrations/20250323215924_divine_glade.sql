/*
  # Add Sample Items

  1. Changes
    - Add sample items for each category
    - Set appropriate prices, descriptions, and sequences
    - Mark some items as popular
    - All items active by default
    
  2. Implementation
    - Insert items with proper category_id references
    - Set realistic prices and descriptions
    - Add sequence numbers for ordering
*/

-- Insert items for each category
WITH category_names AS (
  SELECT id, name FROM categories
)
INSERT INTO items (
  category_id,
  name,
  description,
  price,
  is_popular,
  sequence
)
SELECT 
  c.id as category_id,
  i.name,
  i.description,
  i.price,
  i.is_popular,
  i.sequence
FROM category_names c
CROSS JOIN LATERAL (
  SELECT *
  FROM (
    -- Everyday Wear items
    SELECT 'T-Shirts & Tops'::text as name, 'Cotton shirts and casual tops'::text as description, 4.99::numeric as price, true::boolean as is_popular, 1::integer as sequence WHERE c.name = 'Everyday Wear'
    UNION ALL
    SELECT 'Pants & Jeans', 'All types of pants and denim', 6.99, false, 2 WHERE c.name = 'Everyday Wear'
    UNION ALL
    SELECT 'Dresses', 'Casual and semi-formal dresses', 8.99, false, 3 WHERE c.name = 'Everyday Wear'
    UNION ALL
    SELECT 'Undergarments', 'Delicate wash for underclothes', 3.99, false, 4 WHERE c.name = 'Everyday Wear'

    -- Bedding & Linens items
    UNION ALL
    SELECT 'Single Bed Set', 'Sheet, duvet cover, and 2 pillowcases', 24.99, true, 1 WHERE c.name = 'Bedding & Linens'
    UNION ALL
    SELECT 'Double Bed Set', 'Sheet, duvet cover, and 4 pillowcases', 29.99, false, 2 WHERE c.name = 'Bedding & Linens'
    UNION ALL
    SELECT 'Duvet Cover', 'Any size duvet cover', 19.99, false, 3 WHERE c.name = 'Bedding & Linens'
    UNION ALL
    SELECT 'Pillowcases', 'Set of 2 pillowcases', 9.99, false, 4 WHERE c.name = 'Bedding & Linens'

    -- Towels & Bath items
    UNION ALL
    SELECT 'Bath Towel Set', '2 bath towels, 2 hand towels, 2 washcloths', 19.99, true, 1 WHERE c.name = 'Towels & Bath'
    UNION ALL
    SELECT 'Large Bath Towels', 'Premium bath towels', 8.99, false, 2 WHERE c.name = 'Towels & Bath'
    UNION ALL
    SELECT 'Hand Towels', 'Set of 4 hand towels', 12.99, false, 3 WHERE c.name = 'Towels & Bath'
    UNION ALL
    SELECT 'Washcloths', 'Set of 6 washcloths', 9.99, false, 4 WHERE c.name = 'Towels & Bath'

    -- Sports & Active items
    UNION ALL
    SELECT 'Gym Clothes Set', 'Workout top and bottom', 14.99, true, 1 WHERE c.name = 'Sports & Active'
    UNION ALL
    SELECT 'Sports Uniforms', 'Team uniforms and jerseys', 16.99, false, 2 WHERE c.name = 'Sports & Active'
    UNION ALL
    SELECT 'Swimwear', 'Swimsuits and swim trunks', 9.99, false, 3 WHERE c.name = 'Sports & Active'
    UNION ALL
    SELECT 'Athletic Gear', 'Sports equipment and gear', 12.99, false, 4 WHERE c.name = 'Sports & Active'

    -- Formal Wear items
    UNION ALL
    SELECT 'Business Suit', 'Two-piece suit dry cleaning', 29.99, true, 1 WHERE c.name = 'Formal Wear'
    UNION ALL
    SELECT 'Evening Gown', 'Formal dress cleaning', 34.99, false, 2 WHERE c.name = 'Formal Wear'
    UNION ALL
    SELECT 'Tuxedo', 'Complete tuxedo cleaning', 39.99, false, 3 WHERE c.name = 'Formal Wear'
    UNION ALL
    SELECT 'Formal Shirts', 'Dress shirts and blouses', 12.99, false, 4 WHERE c.name = 'Formal Wear'

    -- Winter Coats items
    UNION ALL
    SELECT 'Down Jacket', 'Down-filled winter coat cleaning', 39.99, true, 1 WHERE c.name = 'Winter Coats'
    UNION ALL
    SELECT 'Wool Coat', 'Wool coat cleaning and care', 34.99, false, 2 WHERE c.name = 'Winter Coats'
    UNION ALL
    SELECT 'Leather Jacket', 'Leather cleaning and conditioning', 44.99, false, 3 WHERE c.name = 'Winter Coats'
    UNION ALL
    SELECT 'Winter Accessories', 'Scarves, gloves, and hats', 14.99, false, 4 WHERE c.name = 'Winter Coats'

    -- Delicate Items items
    UNION ALL
    SELECT 'Silk Blouse', 'Silk garment cleaning', 19.99, true, 1 WHERE c.name = 'Delicate Items'
    UNION ALL
    SELECT 'Cashmere Sweater', 'Cashmere care and cleaning', 24.99, false, 2 WHERE c.name = 'Delicate Items'
    UNION ALL
    SELECT 'Sequined Items', 'Special care for embellished clothing', 29.99, false, 3 WHERE c.name = 'Delicate Items'
    UNION ALL
    SELECT 'Lace Garments', 'Delicate lace item cleaning', 22.99, false, 4 WHERE c.name = 'Delicate Items'

    -- Designer Wear items
    UNION ALL
    SELECT 'Designer Suits', 'Premium suit care', 49.99, true, 1 WHERE c.name = 'Designer Wear'
    UNION ALL
    SELECT 'Designer Dresses', 'High-end dress cleaning', 44.99, false, 2 WHERE c.name = 'Designer Wear'
    UNION ALL
    SELECT 'Luxury Accessories', 'Designer scarves and ties', 24.99, false, 3 WHERE c.name = 'Designer Wear'
    UNION ALL
    SELECT 'Premium Outerwear', 'Designer coat cleaning', 54.99, false, 4 WHERE c.name = 'Designer Wear'

    -- Hemming & Length items
    UNION ALL
    SELECT 'Pants Hemming', 'Basic pants length adjustment', 14.99, true, 1 WHERE c.name = 'Hemming & Length'
    UNION ALL
    SELECT 'Dress Hemming', 'Dress length adjustment', 19.99, false, 2 WHERE c.name = 'Hemming & Length'
    UNION ALL
    SELECT 'Skirt Hemming', 'Skirt length adjustment', 16.99, false, 3 WHERE c.name = 'Hemming & Length'
    UNION ALL
    SELECT 'Sleeve Length', 'Sleeve shortening or lengthening', 19.99, false, 4 WHERE c.name = 'Hemming & Length'

    -- Repairs items
    UNION ALL
    SELECT 'Zipper Replacement', 'Replace broken zipper', 24.99, true, 1 WHERE c.name = 'Repairs'
    UNION ALL
    SELECT 'Patch Repair', 'Fix holes and tears', 19.99, false, 2 WHERE c.name = 'Repairs'
    UNION ALL
    SELECT 'Button Replacement', 'Replace missing buttons', 9.99, false, 3 WHERE c.name = 'Repairs'
    UNION ALL
    SELECT 'Seam Repair', 'Fix split seams', 14.99, false, 4 WHERE c.name = 'Repairs'

    -- Alterations items
    UNION ALL
    SELECT 'Waist Adjustment', 'Take in or let out waist', 29.99, true, 1 WHERE c.name = 'Alterations'
    UNION ALL
    SELECT 'Shoulder Adjustment', 'Adjust shoulder fit', 34.99, false, 2 WHERE c.name = 'Alterations'
    UNION ALL
    SELECT 'Dress Resizing', 'Adjust dress size', 39.99, false, 3 WHERE c.name = 'Alterations'
    UNION ALL
    SELECT 'Suit Alterations', 'Complete suit alterations', 49.99, false, 4 WHERE c.name = 'Alterations'

    -- Custom Work items
    UNION ALL
    SELECT 'Custom Tailoring', 'Made-to-measure alterations', 59.99, true, 1 WHERE c.name = 'Custom Work'
    UNION ALL
    SELECT 'Wedding Dress', 'Wedding dress alterations', 99.99, false, 2 WHERE c.name = 'Custom Work'
    UNION ALL
    SELECT 'Formal Wear', 'Formal wear customization', 79.99, false, 3 WHERE c.name = 'Custom Work'
    UNION ALL
    SELECT 'Special Requests', 'Custom alteration requests', 49.99, false, 4 WHERE c.name = 'Custom Work'
  ) AS items
) AS i;