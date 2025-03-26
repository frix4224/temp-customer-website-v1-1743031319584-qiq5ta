/*
  # Add Admin Price and Notes Fields

  1. Changes
    - Add admin_price column for final price
    - Add admin_note column for final note to customer
    - Add admin_quoted_at timestamp
    
  2. Implementation
    - Add new columns with appropriate types
    - Ensure proper constraints
*/

-- Add new columns for admin pricing and notes
ALTER TABLE custom_price_quotes
ADD COLUMN admin_price numeric(10,2),
ADD COLUMN admin_note text,
ADD COLUMN admin_quoted_at timestamptz;