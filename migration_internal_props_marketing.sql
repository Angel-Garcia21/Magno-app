-- Migration to add marketing_data to internal_properties
ALTER TABLE public.internal_properties 
ADD COLUMN IF NOT EXISTS marketing_data JSONB DEFAULT '{}'::jsonb;

-- Ensure status column exists and has a default
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='internal_properties' AND column_name='status') THEN
        ALTER TABLE public.internal_properties ADD COLUMN status TEXT DEFAULT 'available';
    END IF;
END $$;
