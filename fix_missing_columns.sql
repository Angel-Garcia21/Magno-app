-- Add title and address overrides to profiles
-- This ensures the dashboard shows what the admin entered even if property_code doesn't match an existing property.

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS property_title text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS property_address text;
