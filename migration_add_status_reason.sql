-- Add status_reason column to properties table
ALTER TABLE public.properties 
ADD COLUMN IF NOT EXISTS status_reason TEXT;

COMMENT ON COLUMN public.properties.status_reason IS 'Reason why the property was paused or reserved (e.g., tenant in background check, owner decided to wait, etc.)';
