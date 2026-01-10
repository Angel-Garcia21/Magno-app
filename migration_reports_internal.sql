-- Migration: Add internal_property_id to reports table
ALTER TABLE public.reports 
  ADD COLUMN IF NOT EXISTS internal_property_id uuid REFERENCES public.internal_properties(id);

COMMENT ON COLUMN public.reports.internal_property_id IS 'Link for internal properties (not in public catalog)';
