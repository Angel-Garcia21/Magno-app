-- Migration: Add location fields to properties table
-- This enables MapBox integration by storing geographic coordinates

-- Add location columns to properties table
ALTER TABLE public.properties 
ADD COLUMN IF NOT EXISTS latitude numeric,
ADD COLUMN IF NOT EXISTS longitude numeric,
ADD COLUMN IF NOT EXISTS full_address text;

-- Create index for location queries (optional, for better performance)
CREATE INDEX IF NOT EXISTS idx_properties_location 
ON public.properties (latitude, longitude);

-- Add comment for documentation
COMMENT ON COLUMN public.properties.latitude IS 'Geographic latitude coordinate for map display';
COMMENT ON COLUMN public.properties.longitude IS 'Geographic longitude coordinate for map display';
COMMENT ON COLUMN public.properties.full_address IS 'Formatted full address from geocoding service';
