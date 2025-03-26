/*
  # Add sample custom price quotes

  1. Changes
    - Insert sample custom price quotes with different statuses and urgency levels
    - Include a mix of pending, quoted, accepted, and declined quotes
    - Add realistic descriptions and prices
*/

INSERT INTO custom_price_quotes (
  item_name,
  description,
  suggested_price,
  status,
  urgency,
  created_at
)
VALUES
  (
    'Vintage Wedding Dress',
    'Delicate lace wedding dress from 1950s, needs special care and cleaning',
    299.99,
    'quoted',
    'standard',
    now() - interval '2 days'
  ),
  (
    'Persian Rug 8x10',
    'Handmade wool rug with wine stain in the corner',
    NULL,
    'pending',
    'standard',
    now() - interval '1 day'
  ),
  (
    'Designer Leather Jacket',
    'Black leather jacket with minor scuff marks, needs leather conditioning',
    189.99,
    'accepted',
    'express',
    now() - interval '3 days'
  ),
  (
    'Silk Curtains Set',
    'Set of 4 pure silk curtains with sun damage on edges',
    149.99,
    'declined',
    'standard',
    now() - interval '4 days'
  ),
  (
    'Suede Couch Cushions',
    'Water damage on three cushions, need deep cleaning and restoration',
    NULL,
    'pending',
    'express',
    now() - interval '12 hours'
  );