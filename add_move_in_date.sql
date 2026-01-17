
-- Add missing columns to rental_applications
ALTER TABLE public.rental_applications 
ADD COLUMN IF NOT EXISTS move_in_date DATE,
ADD COLUMN IF NOT EXISTS notes TEXT,
ADD COLUMN IF NOT EXISTS knows_area BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS reason TEXT;

-- Grant permissions just in case
GRANT ALL ON public.rental_applications TO authenticated;
GRANT ALL ON public.rental_applications TO anon;
