-- Add lead_id to appointments table to link with prospects
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS lead_id UUID REFERENCES public.leads_prospectos(id) ON DELETE SET NULL;

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_appointments_lead_id ON public.appointments(lead_id);
