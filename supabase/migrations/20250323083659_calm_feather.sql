/*
  # Enable RLS and add policies for custom price quotes

  1. Security Changes
    - Enable Row Level Security on custom_price_quotes table
    - Add policies for:
      - Authenticated users can read all quotes
      - Service role can manage all quotes
      - Authenticated users can update quotes they own
*/

-- Enable RLS
ALTER TABLE custom_price_quotes ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read all quotes
CREATE POLICY "Users can read all quotes"
ON custom_price_quotes
FOR SELECT
TO authenticated
USING (true);

-- Allow service role to manage all quotes
CREATE POLICY "Service role can manage all quotes"
ON custom_price_quotes
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Allow authenticated users to update quotes
CREATE POLICY "Users can update quotes"
ON custom_price_quotes
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);