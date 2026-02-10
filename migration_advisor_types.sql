-- SQL Migration: Add Advisor Type to Profiles

-- 1. Create Type if it doesn't exist
DO $$ BEGIN
    CREATE TYPE public.advisor_type AS ENUM ('cerrador', 'opcionador');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Add column to asesor_profiles
ALTER TABLE public.asesor_profiles 
ADD COLUMN IF NOT EXISTS advisor_type public.advisor_type DEFAULT 'cerrador';

-- 3. Update existing profiles to 'cerrador' as default if they are null
UPDATE public.asesor_profiles 
SET advisor_type = 'cerrador' 
WHERE advisor_type IS NULL;
