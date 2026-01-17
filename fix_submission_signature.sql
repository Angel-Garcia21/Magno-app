-- Add is_signed column to property_submissions
ALTER TABLE public.property_submissions 
ADD COLUMN IF NOT EXISTS is_signed BOOLEAN DEFAULT false;

-- Update existing records to true if they are already approved (as they must have been signed or were from old system)
UPDATE public.property_submissions 
SET is_signed = true 
WHERE status = 'approved';
