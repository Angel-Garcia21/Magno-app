-- 1. ADD DELETE POLICY FOR PROPERTIES
-- Allows Admins and Owners to delete properties
CREATE POLICY "Admins and Owners can delete properties"
ON public.properties
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid() AND (role = 'admin' OR id = properties.owner_id)
  )
);

-- 2. FIX FOREIGN KEY CASCADE FOR TIMELINE EVENTS
-- This ensures that when a property is deleted, its timeline events are also deleted
-- First, drop the existing constraint if possible, or just add a new one after dropping.
-- Note: In Supabase, if you don't know the constraint name, you can find it or just run:
ALTER TABLE public.timeline_events
DROP CONSTRAINT IF EXISTS timeline_events_property_id_fkey,
ADD CONSTRAINT timeline_events_property_id_fkey
FOREIGN KEY (property_id)
REFERENCES public.properties(id)
ON DELETE CASCADE;
