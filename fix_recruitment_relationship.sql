-- Fix relationship for PostgREST to allow joining 'property_submissions' with 'profiles'
-- This error happens because 'owner_id' currently references 'auth.users' directly,
-- and PostgREST needs an explicit reference to 'public.profiles' to perform auto-joins.

ALTER TABLE public.property_submissions
DROP CONSTRAINT IF EXISTS property_submissions_owner_id_fkey;

ALTER TABLE public.property_submissions
ADD CONSTRAINT property_submissions_owner_id_fkey 
FOREIGN KEY (owner_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- Also verify that the admin has access to the submissions (RLS check)
-- The existing policy already checks public.profiles, so it should be fine.
