/*
  # Update Services Structure

  1. Changes
    - Delete existing data from services, categories, and items tables
    - Insert new services with updated structure
    - Add categories with icons for each service
    - Insert items with prices and descriptions
    
  2. Implementation
    - Clean slate approach with DELETE statements
    - Insert services first, then categories, then items
    - Maintain referential integrity with foreign keys
*/

-- Clean existing data
DELETE FROM items;
DELETE FROM categories;
DELETE FROM services;

-- Insert new services
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
  'Professional washing service for everyday clothes and garments',
  'Expert care for your daily wear',
  'shirt',
  2.00,
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
  3.50,
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
  6.00,
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
  5.00,
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
  icon,
  sequence,
  status
)
SELECT 
  service_regular.id,
  name,
  description,
  icon,
  sequence,
  true
FROM service_regular
CROSS JOIN (
  VALUES
    ('Tops', 'All types of tops and shirts', 'shirt', 1),
    ('Bottoms', 'Pants, shorts and skirts', 'pants', 2),
    ('Underwear & Socks', 'Undergarments and hosiery', 'sock', 3)
) AS c(name, description, icon, sequence);

-- Insert categories for Wash & Iron
WITH service_wash_iron AS (
  SELECT id FROM services WHERE service_identifier = 'wash-and-iron'
)
INSERT INTO categories (
  service_id,
  name,
  description,
  icon,
  sequence,
  status
)
SELECT 
  service_wash_iron.id,
  name,
  description,
  icon,
  sequence,
  true
FROM service_wash_iron
CROSS JOIN (
  VALUES
    ('Formal Wear', 'Business and formal attire', 'suit', 1),
    ('Casual Wear', 'Everyday casual clothes', 'shirt', 2),
    ('Home Textiles', 'Household linens and fabrics', 'bed', 3)
) AS c(name, description, icon, sequence);

-- Insert categories for Dry Cleaning
WITH service_dry_cleaning AS (
  SELECT id FROM services WHERE service_identifier = 'dry-cleaning'
)
INSERT INTO categories (
  service_id,
  name,
  description,
  icon,
  sequence,
  status
)
SELECT 
  service_dry_cleaning.id,
  name,
  description,
  icon,
  sequence,
  true
FROM service_dry_cleaning
CROSS JOIN (
  VALUES
    ('Outerwear', 'Coats and heavy jackets', 'jacket', 1),
    ('Business Attire', 'Professional business wear', 'briefcase', 2),
    ('Delicate Dresses', 'Special occasion dresses', 'dress', 3)
) AS c(name, description, icon, sequence);

-- Insert categories for Repairs & Alterations
WITH service_repairs AS (
  SELECT id FROM services WHERE service_identifier = 'repairs-alterations'
)
INSERT INTO categories (
  service_id,
  name,
  description,
  icon,
  sequence,
  status
)
SELECT 
  service_repairs.id,
  name,
  description,
  icon,
  sequence,
  true
FROM service_repairs
CROSS JOIN (
  VALUES
    ('Hemming', 'Length adjustments', 'ruler', 1),
    ('Zipper & Button', 'Fastener repairs and replacements', 'link', 2),
    ('Patch & Tear', 'Fabric repairs', 'scissors', 3)
) AS c(name, description, icon, sequence);

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
  i.active
FROM category_data cd,
LATERAL (
  VALUES
    -- Regular Laundry - Tops
    ('T-Shirt', 'Basic cotton or synthetic t-shirts.', 2.50, false, 1, true),
    ('Shirt', 'Casual or formal shirts.', 3.00, true, 2, true),
    ('Blouse', 'Light blouses, silk or cotton.', 3.50, false, 3, true),
    ('Tank Top', 'Sleeveless tops and vests.', 2.00, false, 4, true),

    -- Regular Laundry - Bottoms
    ('Jeans', 'Regular or skinny denim jeans.', 4.00, true, 1, true),
    ('Trousers', 'Casual or work trousers.', 3.50, false, 2, true),
    ('Shorts', 'Casual shorts or sport shorts.', 2.50, false, 3, true),
    ('Leggings', 'Cotton or stretch leggings.', 2.50, false, 4, true),

    -- Regular Laundry - Underwear & Socks
    ('Underwear', 'Boxers, briefs, etc.', 1.00, false, 1, true),
    ('Socks', 'Pairs of socks (cotton/wool).', 1.00, false, 2, true),
    ('Bra', 'All types of bras.', 2.00, true, 3, true),
    ('Undershirt', 'Cotton or thermal undershirts.', 1.50, false, 4, true),

    -- Wash & Iron - Formal Wear
    ('Dress Shirt', 'Ironed and hand-finished shirts.', 4.00, true, 1, true),
    ('Dress Pants', 'Business trousers, pressed and finished.', 4.50, false, 2, true),
    ('Blazer', 'Jackets ironed and shaped.', 6.00, false, 3, true),
    ('Two-piece Suit', 'Full suit (jacket + pants).', 10.00, true, 4, true),

    -- Wash & Iron - Casual Wear
    ('Sweater', 'Knits and woolen sweaters.', 4.00, false, 1, true),
    ('Hoodie', 'Casual hooded tops.', 4.50, false, 2, true),
    ('Polo Shirt', 'Smart casual polo tops.', 3.50, true, 3, true),

    -- Wash & Iron - Home Textiles
    ('Pillow Case', 'Standard or decorative pillow covers.', 2.00, false, 1, true),
    ('Bedsheet', 'Flat or fitted bedsheets.', 4.00, true, 2, true),
    ('Tablecloth', 'Cotton or linen table covers.', 3.00, false, 3, true),

    -- Dry Cleaning - Outerwear
    ('Coat', 'Winter coats and long jackets.', 12.00, true, 1, true),
    ('Trench Coat', 'Waterproof or stylish trench coats.', 14.00, false, 2, true),
    ('Ski Jacket', 'Thick insulated jackets.', 15.00, false, 3, true),
    ('Leather Jacket', 'Special care leather jackets.', 25.00, true, 4, true),

    -- Dry Cleaning - Business Attire
    ('Blazer', 'Dry-cleaned and steamed.', 6.00, true, 1, true),
    ('Suit Jacket', 'All types of suit jackets.', 7.00, false, 2, true),
    ('Suit Pants', 'Part of a formal suit.', 5.00, false, 3, true),
    ('Tie', 'Silk and delicate ties.', 3.00, false, 4, true),

    -- Dry Cleaning - Delicate Dresses
    ('Silk Dress', 'Silk or satin delicate dresses.', 15.00, true, 1, true),
    ('Evening Gown', 'Long or formal evening dresses.', 20.00, true, 2, true),
    ('Cocktail Dress', 'Short party and occasion dresses.', 18.00, false, 3, true),

    -- Repairs & Alterations - Hemming
    ('Hemming Pants', 'Shorten or adjust trousers.', 10.00, true, 1, true),
    ('Hemming Skirt', 'Shorten or adjust skirts.', 10.00, false, 2, true),
    ('Hemming Dress', 'Adjust dress length neatly.', 12.00, false, 3, true),

    -- Repairs & Alterations - Zipper & Button
    ('Zipper Replacement', 'Replace broken or damaged zippers.', 15.00, true, 1, true),
    ('Button Repair', 'Reattach or replace buttons.', 5.00, false, 2, true),
    ('Zipper / Leather Jacket - €50', 'High-quality zip replacement for leather jackets.', 50.00, false, 3, true),

    -- Repairs & Alterations - Patch & Tear
    ('Small Patch', 'Small fabric patches over holes.', 8.00, true, 1, true),
    ('Tear Repair', 'Sew torn seams or fabric.', 10.00, false, 2, true),
    ('Reinforcement Stitch', 'Strengthen weak or stressed areas.', 6.00, false, 3, true)
) AS i(name, description, price, is_popular, sequence, active)
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