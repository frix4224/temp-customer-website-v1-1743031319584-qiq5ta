/*
  # Update Services Data Structure

  1. Changes
    - Delete existing data
    - Insert new services with complete details
    - Add categories for each service
    - Insert items with proper category assignments
    
  2. Implementation
    - Use transactions for data integrity
    - Maintain referential integrity
    - Set proper defaults and constraints
*/

-- Start with clean slate
DELETE FROM items;
DELETE FROM categories;
DELETE FROM services;

-- Insert services
INSERT INTO services (
  name,
  description,
  short_description,
  icon,
  price_starts_at,
  price_unit,
  features,
  benefits,
  service_identifier,
  sequence,
  is_popular,
  status
) VALUES
(
  'Regular Laundry',
  'Professional washing service for everyday clothes',
  'Expert care for your daily wear',
  'shirt',
  2.50,
  'per item',
  ARRAY['Professional Cleaning', 'Stain Treatment', 'Fresh Scent'],
  ARRAY['Save Time', 'Expert Care', 'Affordable Rates'],
  'regular-laundry',
  1,
  true,
  true
),
(
  'Wash & Iron',
  'Complete washing and professional ironing service',
  'Perfectly pressed and ready to wear',
  'iron',
  4.00,
  'per item',
  ARRAY['Deep Clean', 'Professional Pressing', 'Careful Handling'],
  ARRAY['Crisp Results', 'Time Saving', 'Professional Look'],
  'wash-and-iron',
  2,
  true,
  true
),
(
  'Dry Cleaning',
  'Expert dry cleaning for delicate and special care items',
  'Specialist care for fine garments',
  'wind',
  12.00,
  'per item',
  ARRAY['Gentle Process', 'Stain Removal', 'Premium Care'],
  ARRAY['Safe for Delicates', 'Expert Treatment', 'Like New Results'],
  'dry-cleaning',
  3,
  false,
  true
),
(
  'Repairs & Alterations',
  'Professional clothing repairs and alterations service',
  'Expert tailoring and repairs',
  'scissors',
  10.00,
  'per service',
  ARRAY['Expert Tailoring', 'Quality Materials', 'Perfect Fit'],
  ARRAY['Professional Results', 'Quick Service', 'Satisfaction Guaranteed'],
  'repairs-alterations',
  4,
  false,
  true
);

-- Insert categories for Regular Laundry
WITH service_regular AS (
  SELECT id FROM services WHERE service_identifier = 'regular-laundry'
)
INSERT INTO categories (
  service_id,
  name,
  description,
  sequence,
  status
)
SELECT 
  service_regular.id,
  name,
  description,
  sequence,
  true
FROM service_regular
CROSS JOIN (
  VALUES
    ('Tops', 'All types of tops and shirts', 1),
    ('Bottoms', 'Pants, shorts and skirts', 2),
    ('Underwear & Socks', 'Undergarments and hosiery', 3)
) AS c(name, description, sequence);

-- Insert categories for Wash & Iron
WITH service_wash_iron AS (
  SELECT id FROM services WHERE service_identifier = 'wash-and-iron'
)
INSERT INTO categories (
  service_id,
  name,
  description,
  sequence,
  status
)
SELECT 
  service_wash_iron.id,
  name,
  description,
  sequence,
  true
FROM service_wash_iron
CROSS JOIN (
  VALUES
    ('Formal Wear', 'Business and formal attire', 1),
    ('Casual Wear', 'Everyday casual clothes', 2),
    ('Home Textiles', 'Household linens and fabrics', 3)
) AS c(name, description, sequence);

-- Insert categories for Dry Cleaning
WITH service_dry_cleaning AS (
  SELECT id FROM services WHERE service_identifier = 'dry-cleaning'
)
INSERT INTO categories (
  service_id,
  name,
  description,
  sequence,
  status
)
SELECT 
  service_dry_cleaning.id,
  name,
  description,
  sequence,
  true
FROM service_dry_cleaning
CROSS JOIN (
  VALUES
    ('Outerwear', 'Coats and heavy jackets', 1),
    ('Business Attire', 'Professional business wear', 2),
    ('Delicate Dresses', 'Special occasion dresses', 3)
) AS c(name, description, sequence);

-- Insert categories for Repairs & Alterations
WITH service_repairs AS (
  SELECT id FROM services WHERE service_identifier = 'repairs-alterations'
)
INSERT INTO categories (
  service_id,
  name,
  description,
  sequence,
  status
)
SELECT 
  service_repairs.id,
  name,
  description,
  sequence,
  true
FROM service_repairs
CROSS JOIN (
  VALUES
    ('Hemming', 'Length adjustments', 1),
    ('Zipper & Button', 'Fastener repairs and replacements', 2),
    ('Patch & Tear', 'Fabric repairs', 3)
) AS c(name, description, sequence);

-- Insert items for each category
WITH category_data AS (
  SELECT c.id, c.name as category_name, s.service_identifier
  FROM categories c
  JOIN services s ON c.service_id = s.id
)
INSERT INTO items (
  category_id,
  name,
  description,
  price,
  is_popular,
  sequence,
  status
)
SELECT 
  cd.id,
  i.name,
  i.description,
  i.price,
  i.is_popular,
  i.sequence,
  true
FROM category_data cd,
LATERAL (
  VALUES
    -- Regular Laundry - Tops
    ('T-Shirt', 'Basic cotton or synthetic t-shirts.', 2.50, false, 1),
    ('Shirt', 'Casual or formal shirts.', 3.00, true, 2),
    ('Blouse', 'Light blouses, silk or cotton.', 3.50, false, 3),
    ('Tank Top', 'Sleeveless tops and vests.', 2.00, false, 4),

    -- Regular Laundry - Bottoms
    ('Jeans', 'Regular or skinny denim jeans.', 4.00, true, 1),
    ('Trousers', 'Casual or work trousers.', 3.50, false, 2),
    ('Shorts', 'Casual shorts or sport shorts.', 2.50, false, 3),
    ('Leggings', 'Cotton or stretch leggings.', 2.50, false, 4),

    -- Regular Laundry - Underwear & Socks
    ('Underwear', 'Boxers, briefs, etc.', 1.00, false, 1),
    ('Socks', 'Pairs of socks (cotton/wool).', 1.00, false, 2),
    ('Bra', 'All types of bras.', 2.00, true, 3),
    ('Undershirt', 'Cotton or thermal undershirts.', 1.50, false, 4),

    -- Wash & Iron - Formal Wear
    ('Dress Shirt', 'Ironed and hand-finished shirts.', 4.00, true, 1),
    ('Dress Pants', 'Business trousers, pressed and finished.', 4.50, false, 2),
    ('Blazer', 'Jackets ironed and shaped.', 6.00, false, 3),
    ('Two-piece Suit', 'Full suit (jacket + pants).', 10.00, true, 4),

    -- Wash & Iron - Casual Wear
    ('Sweater', 'Knits and woolen sweaters.', 4.00, false, 1),
    ('Hoodie', 'Casual hooded tops.', 4.50, false, 2),
    ('Polo Shirt', 'Smart casual polo tops.', 3.50, true, 3),

    -- Wash & Iron - Home Textiles
    ('Pillow Case', 'Standard or decorative pillow covers.', 2.00, false, 1),
    ('Bedsheet', 'Flat or fitted bedsheets.', 4.00, true, 2),
    ('Tablecloth', 'Cotton or linen table covers.', 3.00, false, 3),

    -- Dry Cleaning - Outerwear
    ('Coat', 'Winter coats and long jackets.', 12.00, true, 1),
    ('Trench Coat', 'Waterproof or stylish trench coats.', 14.00, false, 2),
    ('Ski Jacket', 'Thick insulated jackets.', 15.00, false, 3),
    ('Leather Jacket', 'Special care leather jackets.', 25.00, true, 4),

    -- Dry Cleaning - Business Attire
    ('Business Suit', 'Two-piece suit dry cleaning.', 20.00, true, 1),
    ('Suit Jacket', 'All types of suit jackets.', 7.00, false, 2),
    ('Suit Pants', 'Part of a formal suit.', 5.00, false, 3),
    ('Tie', 'Silk and delicate ties.', 3.00, false, 4),

    -- Dry Cleaning - Delicate Dresses
    ('Silk Dress', 'Silk or satin delicate dresses.', 15.00, true, 1),
    ('Evening Gown', 'Long or formal evening dresses.', 20.00, true, 2),
    ('Cocktail Dress', 'Short party and occasion dresses.', 18.00, false, 3),

    -- Repairs & Alterations - Hemming
    ('Hemming Pants', 'Shorten or adjust trousers.', 10.00, true, 1),
    ('Hemming Skirt', 'Shorten or adjust skirts.', 10.00, false, 2),
    ('Hemming Dress', 'Adjust dress length neatly.', 12.00, false, 3),

    -- Repairs & Alterations - Zipper & Button
    ('Zipper Replacement', 'Replace broken or damaged zippers.', 15.00, true, 1),
    ('Button Repair', 'Reattach or replace buttons.', 5.00, false, 2),
    ('Leather Jacket Zipper', 'High-quality zip replacement for leather jackets.', 50.00, false, 3),

    -- Repairs & Alterations - Patch & Tear
    ('Small Patch', 'Small fabric patches over holes.', 8.00, true, 1),
    ('Tear Repair', 'Sew torn seams or fabric.', 10.00, false, 2),
    ('Reinforcement Stitch', 'Strengthen weak or stressed areas.', 6.00, false, 3)
) AS i(name, description, price, is_popular, sequence)
WHERE 
  (cd.service_identifier = 'regular-laundry' AND cd.category_name = 'Tops' AND i.sequence <= 4) OR
  (cd.service_identifier = 'regular-laundry' AND cd.category_name = 'Bottoms' AND i.sequence <= 4) OR
  (cd.service_identifier = 'regular-laundry' AND cd.category_name = 'Underwear & Socks' AND i.sequence <= 4) OR
  (cd.service_identifier = 'wash-and-iron' AND cd.category_name = 'Formal Wear' AND i.sequence <= 4) OR
  (cd.service_identifier = 'wash-and-iron' AND cd.category_name = 'Casual Wear' AND i.sequence <= 3) OR
  (cd.service_identifier = 'wash-and-iron' AND cd.category_name = 'Home Textiles' AND i.sequence <= 3) OR
  (cd.service_identifier = 'dry-cleaning' AND cd.category_name = 'Outerwear' AND i.sequence <= 4) OR
  (cd.service_identifier = 'dry-cleaning' AND cd.category_name = 'Business Attire' AND i.sequence <= 4) OR
  (cd.service_identifier = 'dry-cleaning' AND cd.category_name = 'Delicate Dresses' AND i.sequence <= 3) OR
  (cd.service_identifier = 'repairs-alterations' AND cd.category_name = 'Hemming' AND i.sequence <= 3) OR
  (cd.service_identifier = 'repairs-alterations' AND cd.category_name = 'Zipper & Button' AND i.sequence <= 3) OR
  (cd.service_identifier = 'repairs-alterations' AND cd.category_name = 'Patch & Tear' AND i.sequence <= 3);