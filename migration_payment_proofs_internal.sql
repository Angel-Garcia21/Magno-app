-- Migration: Allow nullable property_id and add internal_property_id to payment_proofs
ALTER TABLE public.payment_proofs 
  ALTER COLUMN property_id DROP NOT NULL;

ALTER TABLE public.payment_proofs 
  ADD COLUMN IF NOT EXISTS internal_property_id uuid REFERENCES public.internal_properties(id);

-- Explicitly allow nulls in property_id if it was accidentally constrained elsewhere
-- ALTER TABLE public.payment_proofs DROP CONSTRAINT IF EXISTS payment_proofs_property_id_fkey;
-- ALTER TABLE public.payment_proofs ADD CONSTRAINT payment_proofs_property_id_fkey 
--  FOREIGN KEY (property_id) REFERENCES public.properties(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.payment_proofs.internal_property_id IS 'Link for internal properties (not in public catalog)';
