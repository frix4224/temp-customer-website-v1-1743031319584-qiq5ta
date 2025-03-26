/*
  # Add Facility Driver Assignment System

  1. New Tables
    - facility_drivers
      - id (uuid, primary key)
      - facility_id (uuid, references facilities)
      - driver_id (uuid, references drivers)
      - created_at (timestamp)
      - updated_at (timestamp)

  2. Changes
    - Add indexes for quick lookups
    - Add foreign key constraints
    - Add triggers for updated_at handling

  3. Security
    - Enable RLS
    - Add policies for service role access
*/

-- Create facility_drivers table for managing assignments
CREATE TABLE IF NOT EXISTS facility_drivers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id uuid REFERENCES facilities(id),
  driver_id uuid REFERENCES drivers(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_facility_drivers_facility_id ON facility_drivers(facility_id);
CREATE INDEX IF NOT EXISTS idx_facility_drivers_driver_id ON facility_drivers(driver_id);

-- Add trigger for updated_at
CREATE TRIGGER facility_drivers_updated_at
  BEFORE UPDATE ON facility_drivers
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();

-- Enable RLS
ALTER TABLE facility_drivers ENABLE ROW LEVEL SECURITY;

-- Add RLS policies
CREATE POLICY "Service role can manage facility_drivers"
  ON facility_drivers
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Add unique constraint to prevent duplicate assignments
ALTER TABLE facility_drivers
ADD CONSTRAINT unique_facility_driver_assignment
UNIQUE (facility_id, driver_id);

-- Add comment
COMMENT ON TABLE facility_drivers IS 'Manages assignments between facilities and drivers';