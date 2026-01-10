-- Fix reports foreign key to point to public.profiles instead of auth.users
-- This allows PostgREST to detect the relationship for joins

ALTER TABLE reports DROP CONSTRAINT IF EXISTS reports_user_id_fkey;

ALTER TABLE reports
  ADD CONSTRAINT reports_user_id_fkey
  FOREIGN KEY (user_id)
  REFERENCES public.profiles(id)
  ON DELETE CASCADE;
