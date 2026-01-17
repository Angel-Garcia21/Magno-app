-- FIX: Missing DELETE policies for administrators
-- This script ensures admins can delete records that previously only had SELECT/INSERT/UPDATE permissions.

-- 1. Reports Table Deletion Policy
DROP POLICY IF EXISTS "Admins can manage all reports" ON public.reports;
CREATE POLICY "Admins can manage all reports"
  ON reports FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- 2. Payment Proofs Table Deletion Policy
DROP POLICY IF EXISTS "Admins can delete proofs" ON public.payment_proofs;
CREATE POLICY "Admins can delete proofs"
  ON public.payment_proofs FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- 3. Rental Applications Table Deletion Policy
DROP POLICY IF EXISTS "Admins can delete rental applications" ON public.rental_applications;
CREATE POLICY "Admins can delete rental applications"
  ON public.rental_applications FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- 4. Comprobantes (payment_proofs) mapping
DROP POLICY IF EXISTS "Admins can manage all proofs" ON public.payment_proofs;
CREATE POLICY "Admins can manage all proofs"
  ON public.payment_proofs FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- 5. Explicitly grant DELETE permissions to authenticated role (Admins are authenticated)
GRANT DELETE ON public.reports TO authenticated;
GRANT DELETE ON public.payment_proofs TO authenticated;
GRANT DELETE ON public.rental_applications TO authenticated;

COMMENT ON TABLE public.reports IS 'Reports table with fixed admin delete policies and grants';
