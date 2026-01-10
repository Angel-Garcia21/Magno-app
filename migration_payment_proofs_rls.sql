-- Migration: Allow Admins to manage all payment proofs
-- This fixes the "RLS Violation" when an Admin marks manual payments for a client

CREATE POLICY "Admins can manage all proofs" 
ON public.payment_proofs 
FOR ALL 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  )
);
