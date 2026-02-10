-- Migration: Extend leads_prospectos for Opcionador workflow

-- 1. Add new fields to leads_prospectos
ALTER TABLE public.leads_prospectos 
ADD COLUMN IF NOT EXISTS source TEXT,
ADD COLUMN IF NOT EXISTS referred_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS operation_type TEXT;

-- 1b. Add referred_by to property_submissions and properties
ALTER TABLE public.property_submissions
ADD COLUMN IF NOT EXISTS referred_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.properties
ADD COLUMN IF NOT EXISTS referred_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

-- 2. Extend lead_status enum
-- Note: Postgres doesn't allow adding values to enums inside a transaction easily in older versions,
-- but since we are likely on a modern Supabase env, we can use ALTER TYPE.
-- However, to be safe and idempotent:
DO $$ 
BEGIN
    ALTER TYPE public.lead_status ADD VALUE IF NOT EXISTS 'interested';
    ALTER TYPE public.lead_status ADD VALUE IF NOT EXISTS 'meeting_doubts';
    ALTER TYPE public.lead_status ADD VALUE IF NOT EXISTS 'property_loading';
    ALTER TYPE public.lead_status ADD VALUE IF NOT EXISTS 'property_signing';
    ALTER TYPE public.lead_status ADD VALUE IF NOT EXISTS 'published';
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

COMMENT ON COLUMN public.leads_prospectos.source IS 'Origen del prospecto (Facebook, Boca a boca, Lona, etc.)';
COMMENT ON COLUMN public.leads_prospectos.operation_type IS 'Tipo de operación: sale o rent';
COMMENT ON COLUMN public.leads_prospectos.referred_by IS 'Asesor que refirió a este prospecto';
