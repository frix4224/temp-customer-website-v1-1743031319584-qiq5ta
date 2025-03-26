/*
  # Add Sample Categories

  1. Changes
    - Add sample categories for each service
    - Categories include common laundry and dry cleaning items
    
  2. Implementation
    - Insert categories with proper service_id references
    - Set appropriate sequence numbers
    - All categories active by default
*/

-- Insert categories for Regular Laundry
INSERT INTO categories (
  service_id,
  name,
  description,
  sequence,
  status
)
SELECT 
  s.id,
  c.name,
  c.description,
  c.sequence,
  true
FROM services s
CROSS JOIN (
  VALUES
    ('Everyday Wear', 'Regular clothes for daily use', 1),
    ('Bedding & Linens', 'Sheets, pillowcases, and other bed items', 2),
    ('Towels & Bath', 'Bath towels, hand towels, and washcloths', 3),
    ('Sports & Active', 'Athletic wear and gym clothes', 4)
) AS c(name, description, sequence)
WHERE s.service_identifier = 'regular-laundry';

-- Insert categories for Dry Cleaning
INSERT INTO categories (
  service_id,
  name,
  description,
  sequence,
  status
)
SELECT 
  s.id,
  c.name,
  c.description,
  c.sequence,
  true
FROM services s
CROSS JOIN (
  VALUES
    ('Formal Wear', 'Suits, dresses, and formal attire', 1),
    ('Winter Coats', 'Heavy coats and winter jackets', 2),
    ('Delicate Items', 'Silk, wool, and other delicate fabrics', 3),
    ('Designer Wear', 'High-end and designer clothing', 4)
) AS c(name, description, sequence)
WHERE s.service_identifier = 'dry-cleaning';

-- Insert categories for Repairs & Alterations
INSERT INTO categories (
  service_id,
  name,
  description,
  sequence,
  status
)
SELECT 
  s.id,
  c.name,
  c.description,
  c.sequence,
  true
FROM services s
CROSS JOIN (
  VALUES
    ('Hemming & Length', 'Pants, skirts, and dress length adjustments', 1),
    ('Repairs', 'Fixing tears, holes, and damaged items', 2),
    ('Alterations', 'Taking in or letting out clothes', 3),
    ('Custom Work', 'Special alterations and custom requests', 4)
) AS c(name, description, sequence)
WHERE s.service_identifier = 'repairs-alterations';