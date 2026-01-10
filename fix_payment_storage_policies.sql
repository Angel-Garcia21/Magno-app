-- =====================================================
-- Fix Payment Proof Storage Policies
-- =====================================================
-- This migration adds comprehensive RLS policies to the
-- payment-proofs storage bucket to prevent unintended
-- file deletion on page reload.
--
-- Issue: Files were being deleted from storage on page
-- reload because there were no DELETE/UPDATE policies.
-- =====================================================

-- 1. Drop existing storage policies for payment-proofs bucket
DROP POLICY IF EXISTS "Give access to authenticated users to upload proofs" ON storage.objects;
DROP POLICY IF EXISTS "Give public access to view proofs" ON storage.objects;

-- 2. INSERT Policy: Users can only upload to their own folder
-- Folder structure: vouchers/{user_id}/{filename}
CREATE POLICY "Users can upload payment proofs to own folder"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'payment-proofs' AND
  (storage.foldername(name))[1] = 'vouchers' AND
  (storage.foldername(name))[2] = auth.uid()::text
);

-- 3. SELECT Policy: Public read access (for viewing proofs)
-- This allows both users and admins to view uploaded payment proofs
CREATE POLICY "Anyone can view payment proofs"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'payment-proofs');

-- 4. UPDATE Policy: Only file owner or admins can update
CREATE POLICY "Only owner or admin can update payment proofs"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'payment-proofs' AND
  (
    -- File owner can update
    (storage.foldername(name))[2] = auth.uid()::text
    OR
    -- Admin can update
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  )
);

-- 5. DELETE Policy: Only admins can delete files
-- This prevents users from accidentally deleting their own proofs
-- Only admins should be able to delete payment proofs
CREATE POLICY "Only admins can delete payment proofs"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'payment-proofs' AND
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  )
);

-- =====================================================
-- Verification Queries
-- =====================================================
-- After running this migration, verify policies exist:
-- 
-- SELECT policyname, cmd, roles, qual, with_check
-- FROM pg_policies
-- WHERE schemaname = 'storage' AND tablename = 'objects'
-- AND policyname LIKE '%payment proof%';
-- =====================================================
