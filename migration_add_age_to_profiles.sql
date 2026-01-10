-- Add age column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS age integer;

-- Add check constraint for age (optional but good practice)
ALTER TABLE public.profiles
ADD CONSTRAINT check_age_positive CHECK (age > 0);
