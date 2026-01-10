-- Add property_id field to profiles table to link users directly to properties
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS property_id UUID REFERENCES properties(id) ON DELETE SET NULL;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_profiles_property_id ON profiles(property_id);

-- Update existing profiles to link them to properties based on property_code
-- This will match profiles.property_code with properties.ref
UPDATE profiles p
SET property_id = (
  SELECT pr.id 
  FROM properties pr 
  WHERE pr.ref = p.property_code 
  LIMIT 1
)
WHERE p.property_code IS NOT NULL AND p.property_id IS NULL;
