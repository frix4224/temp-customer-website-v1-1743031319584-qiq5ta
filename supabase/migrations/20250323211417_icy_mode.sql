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

-- Insert items for Regular Laundry categories
INSERT INTO items (
  category_id,
  name,
  description,
  price,
  is_popular,
  sequence
)
SELECT 
  c.id,
  i.name,
  i.description,
  i.price,
  i.is_popular,
  i.sequence
FROM categories c
CROSS JOIN (
  VALUES
    -- Everyday Wear
    ('T-Shirts & Tops', 'Cotton shirts and casual tops', 4.99, true, 1),
    ('Pants & Jeans', 'All types of pants and denim', 6.99, false, 2),
    ('Dresses', 'Casual and semi-formal dresses', 8.99, false, 3),
    ('Undergarments', 'Delicate wash for underclothes', 3.99, false, 4),
    
    -- Bedding & Linens
    ('Single Bed Set', 'Sheet, duvet cover, and 2 pillowcases', 24.99, true, 1),
    ('Double Bed Set', 'Sheet, duvet cover, and 4 pillowcases', 29.99, false, 2),
    ('Duvet Cover', 'Any size duvet cover', 19.99, false, 3),
    ('Pillowcases', 'Set of 2 pillowcases', 9.99, false, 4),
    
    -- Towels & Bath
    ('Bath Towel Set', '2 bath towels, 2 hand towels, 2 washcloths', 19.99, true, 1),
    ('Large Bath Towels', 'Premium bath towels', 8.99, false, 2),
    ('Hand Towels', 'Set of 4 hand towels', 12.99, false, 3),
    ('Washcloths', 'Set of 6 washcloths', 9.99, false, 4),
    
    -- Sports & Active
    ('Gym Clothes Set', 'Workout top and bottom', 14.99, true, 1),
    ('Sports Uniforms', 'Team uniforms and jerseys', 16.99, false, 2),
    ('Swimwear', 'Swimsuits and swim trunks', 9.99, false, 3),
    ('Athletic Gear', 'Sports equipment and gear', 12.99, false, 4)
) AS i(name, description, price, is_popular, sequence)
WHERE c.name IN ('Everyday Wear', 'Bedding & Linens', 'Towels & Bath', 'Sports & Active');

-- Insert items for Dry Cleaning categories
INSERT INTO items (
  category_id,
  name,
  description,
  price,
  is_popular,
  sequence
)
SELECT 
  c.id,
  i.name,
  i.description,
  i.price,
  i.is_popular,
  i.sequence
FROM categories c
CROSS JOIN (
  VALUES
    -- Formal Wear
    ('Business Suit', 'Two-piece suit dry cleaning', 29.99, true, 1),
    ('Evening Gown', 'Formal dress cleaning', 34.99, false, 2),
    ('Tuxedo', 'Complete tuxedo cleaning', 39.99, false, 3),
    ('Formal Shirts', 'Dress shirts and blouses', 12.99, false, 4),
    
    -- Winter Coats
    ('Down Jacket', 'Down-filled winter coat cleaning', 39.99, true, 1),
    ('Wool Coat', 'Wool coat cleaning and care', 34.99, false, 2),
    ('Leather Jacket', 'Leather cleaning and conditioning', 44.99, false, 3),
    ('Winter Accessories', 'Scarves, gloves, and hats', 14.99, false, 4),
    
    -- Delicate Items
    ('Silk Blouse', 'Silk garment cleaning', 19.99, true, 1),
    ('Cashmere Sweater', 'Cashmere care and cleaning', 24.99, false, 2),
    ('Sequined Items', 'Special care for embellished clothing', 29.99, false, 3),
    ('Lace Garments', 'Delicate lace item cleaning', 22.99, false, 4),
    
    -- Designer Wear
    ('Designer Suits', 'Premium suit care', 49.99, true, 1),
    ('Designer Dresses', 'High-end dress cleaning', 44.99, false, 2),
    ('Luxury Accessories', 'Designer scarves and ties', 24.99, false, 3),
    ('Premium Outerwear', 'Designer coat cleaning', 54.99, false, 4)
) AS i(name, description, price, is_popular, sequence)
WHERE c.name IN ('Formal Wear', 'Winter Coats', 'Delicate Items', 'Designer Wear');

-- Insert items for Repairs & Alterations categories
INSERT INTO items (
  category_id,
  name,
  description,
  price,
  is_popular,
  sequence
)
SELECT 
  c.id,
  i.name,
  i.description,
  i.price,
  i.is_popular,
  i.sequence
FROM categories c
CROSS JOIN (
  VALUES
    -- Hemming & Length
    ('Pants Hemming', 'Basic pants length adjustment', 14.99, true, 1),
    ('Dress Hemming', 'Dress length adjustment', 19.99, false, 2),
    ('Skirt Hemming', 'Skirt length adjustment', 16.99, false, 3),
    ('Sleeve Length', 'Sleeve shortening or lengthening', 19.99, false, 4),
    
    -- Repairs
    ('Zipper Replacement', 'Replace broken zipper', 24.99, true, 1),
    ('Patch Repair', 'Fix holes and tears', 19.99, false, 2),
    ('Button Replacement', 'Replace missing buttons', 9.99, false, 3),
    ('Seam Repair', 'Fix split seams', 14.99, false, 4),
    
    -- Alterations
    ('Waist Adjustment', 'Take in or let out waist', 29.99, true, 1),
    ('Shoulder Adjustment', 'Adjust shoulder fit', 34.99, false, 2),
    ('Dress Resizing', 'Adjust dress size', 39.99, false, 3),
    ('Suit Alterations', 'Complete suit alterations', 49.99, false, 4),
    
    -- Custom Work
    ('Custom Tailoring', 'Made-to-measure alterations', 59.99, true, 1),
    ('Wedding Dress', 'Wedding dress alterations', 99.99, false, 2),
    ('Formal Wear', 'Formal wear customization', 79.99, false, 3),
    ('Special Requests', 'Custom alteration requests', 49.99, false, 4)
) AS i(name, description, price, is_popular, sequence)
WHERE c.name IN ('Hemming & Length', 'Repairs', 'Alterations', 'Custom Work');