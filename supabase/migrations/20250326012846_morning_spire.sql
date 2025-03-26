/*
  # Add Test Orders with Facility

  1. Changes
    - Temporarily disable facility and package triggers
    - Create test facility with proper operating hours
    - Insert 100 test orders with valid state combinations
    - Handle NULL prices for custom price items
    - Re-enable triggers after data insertion
    
  2. Implementation
    - Safe trigger handling
    - Generate realistic test data
    - Maintain data consistency and state validity
*/

-- First create a test facility if none exists
INSERT INTO facilities (
  facility_code,
  user_identifier,
  facility_name,
  address_line_1,
  city,
  zipcode,
  location,
  latitude,
  longitude,
  opening_hour,
  close_hour,
  contact_number,
  email,
  owner_name,
  radius,
  status
) 
SELECT 
  1001,
  1001,
  'Test Facility Amsterdam',
  'Hoofdstraat 1',
  'Amsterdam',
  '1011 AA',
  'Hoofdstraat 1, 1011 AA Amsterdam',
  '52.3676',
  '4.9041',
  '08:00'::time,
  '20:00'::time,
  '+31612345678',
  'facility@test.com',
  'Test Owner',
  25,
  true
WHERE NOT EXISTS (
  SELECT 1 FROM facilities WHERE status = true
);

-- Temporarily disable the facility and package triggers
ALTER TABLE orders DISABLE TRIGGER assign_facility_trigger;
ALTER TABLE orders DISABLE TRIGGER generate_package_for_order;
ALTER TABLE orders DISABLE TRIGGER order_state_transition_trigger;

-- Function to generate random Netherlands addresses
CREATE OR REPLACE FUNCTION generate_nl_address()
RETURNS text AS $$
DECLARE
  streets text[] := ARRAY[
    'Hoofdstraat', 'Kerkstraat', 'Dorpsstraat', 'Schoolstraat', 'Molenweg',
    'Julianastraat', 'Beatrixstraat', 'Wilhelminastraat', 'Stationsweg', 'Nieuwstraat',
    'Marktstraat', 'Raadhuisstraat', 'Industrieweg', 'Emmastraat', 'Oranjestraat'
  ];
  cities text[] := ARRAY[
    'Amsterdam', 'Rotterdam', 'Den Haag', 'Utrecht', 'Eindhoven',
    'Groningen', 'Tilburg', 'Almere', 'Breda', 'Nijmegen',
    'Enschede', 'Haarlem', 'Arnhem', 'Zaanstad', 'Amersfoort'
  ];
  street text;
  house_number integer;
  city text;
  postal_code text;
BEGIN
  street := streets[1 + floor(random() * array_length(streets, 1))];
  house_number := 1 + floor(random() * 150);
  city := cities[1 + floor(random() * array_length(cities, 1))];
  postal_code := concat(
    (1000 + floor(random() * 8999))::text,
    ' ',
    chr((65 + floor(random() * 26)::integer)::integer),
    chr((65 + floor(random() * 26)::integer)::integer)
  );
  
  RETURN concat(street, ' ', house_number, ', ', postal_code, ' ', city);
END;
$$ LANGUAGE plpgsql;

-- Function to generate random coordinates within Netherlands
CREATE OR REPLACE FUNCTION generate_nl_coordinates(address text)
RETURNS TABLE(lat text, lon text) AS $$
BEGIN
  -- Netherlands bounds approximately
  RETURN QUERY SELECT 
    (51.5 + random() * 1.5)::text as lat,
    (4.5 + random() * 2.5)::text as lon;
END;
$$ LANGUAGE plpgsql;

-- Insert test orders
DO $$
DECLARE
  user_id uuid;
  facility_id uuid;
  current_service_id uuid;
  current_category_id uuid;
  item_id uuid;
  item_price numeric(10,2);
  address text;
  coords record;
  order_id uuid;
  delivery_time time;
  payment_methods text[] := ARRAY['credit_card', 'ideal', 'bancontact'];
  payment_statuses text[] := ARRAY['pending', 'paid', 'failed', 'refunded'];
  order_statuses text[] := ARRAY['pending', 'processing', 'shipped', 'delivered'];
  shipping_methods text[] := ARRAY['standard', 'express', 'same_day'];
  order_types text[] := ARRAY['pickup', 'delivery'];
  is_pickup boolean;
  is_processing boolean;
  is_dropoff boolean;
BEGIN
  -- Get a sample user ID
  SELECT id INTO user_id FROM auth.users LIMIT 1;
  
  -- Get the test facility ID
  SELECT id INTO facility_id FROM facilities WHERE status = true LIMIT 1;

  -- Create 100 test orders
  FOR i IN 1..100 LOOP
    -- Generate random address and coordinates
    address := generate_nl_address();
    SELECT * INTO coords FROM generate_nl_coordinates(address);
    
    -- Generate delivery time between 09:00 and 19:00
    delivery_time := (
      '09:00'::time + 
      (random() * (interval '10 hours'))
    )::time;
    
    -- Get random service and category
    SELECT id INTO current_service_id FROM services WHERE status = true ORDER BY random() LIMIT 1;
    SELECT c.id INTO current_category_id 
    FROM categories c 
    WHERE c.service_id = current_service_id 
    ORDER BY random() 
    LIMIT 1;

    -- Generate valid state combinations
    is_pickup := random() > 0.5;
    is_processing := CASE 
      WHEN is_pickup THEN random() > 0.5
      ELSE false
    END;
    is_dropoff := CASE 
      WHEN is_pickup AND NOT is_processing THEN random() > 0.5
      ELSE false
    END;
    
    -- Insert order
    INSERT INTO orders (
      order_number,
      user_id,
      customer_name,
      email,
      phone,
      shipping_address,
      order_date,
      status,
      payment_method,
      payment_status,
      shipping_method,
      estimated_delivery,
      special_instructions,
      subtotal,
      tax,
      shipping_fee,
      total_amount,
      facility_id,
      type,
      latitude,
      longitude,
      is_pickup_completed,
      is_facility_processing,
      is_dropoff_completed
    ) VALUES (
      'ORD-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(i::text, 4, '0'),
      user_id,
      'Test Customer ' || i,
      'customer' || i || '@example.com',
      '+31' || (600000000 + floor(random() * 99999999))::text,
      address,
      NOW() - (random() * interval '30 days'),
      order_statuses[1 + floor(random() * array_length(order_statuses, 1))],
      payment_methods[1 + floor(random() * array_length(payment_methods, 1))],
      payment_statuses[1 + floor(random() * array_length(payment_statuses, 1))],
      shipping_methods[1 + floor(random() * array_length(shipping_methods, 1))],
      (NOW() + (random() * interval '7 days'))::date + delivery_time,
      CASE WHEN random() > 0.7 THEN 'Please handle with care' ELSE NULL END,
      50 + (random() * 200)::numeric(10,2),
      (5 + (random() * 20))::numeric(10,2),
      (5 + (random() * 15))::numeric(10,2),
      (60 + (random() * 235))::numeric(10,2),
      facility_id,
      order_types[1 + floor(random() * array_length(order_types, 1))],
      coords.lat,
      coords.lon,
      is_pickup,
      is_processing,
      is_dropoff
    ) RETURNING id INTO order_id;

    -- Add 1-3 random items to the order
    FOR j IN 1..1 + floor(random() * 3) LOOP
      -- Get random item with non-NULL price
      SELECT i.id, i.price INTO item_id, item_price
      FROM items i
      WHERE i.category_id = current_category_id 
      AND i.price IS NOT NULL
      AND NOT i.is_custom_price
      ORDER BY random() 
      LIMIT 1;

      -- Only insert if we found an item with a price
      IF item_id IS NOT NULL AND item_price IS NOT NULL THEN
        INSERT INTO order_items (
          order_id,
          product_id,
          product_name,
          quantity,
          unit_price,
          subtotal
        )
        SELECT 
          order_id,
          item_id,
          i.name,
          quantity_num,
          item_price,
          item_price * quantity_num
        FROM items i,
        LATERAL (SELECT 1 + floor(random() * 3) as quantity_num) q
        WHERE i.id = item_id;
      END IF;
    END LOOP;

    -- Add order status log
    INSERT INTO order_status_logs (
      order_id,
      status,
      notes,
      logged_by
    ) VALUES (
      order_id,
      'Order created',
      'Initial order placement',
      user_id
    );
  END LOOP;
END $$;

-- Drop the temporary functions
DROP FUNCTION IF EXISTS generate_nl_address();
DROP FUNCTION IF EXISTS generate_nl_coordinates(text);

-- Re-enable all triggers
ALTER TABLE orders ENABLE TRIGGER assign_facility_trigger;
ALTER TABLE orders ENABLE TRIGGER generate_package_for_order;
ALTER TABLE orders ENABLE TRIGGER order_state_transition_trigger;