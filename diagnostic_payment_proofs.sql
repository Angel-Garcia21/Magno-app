-- =====================================================
-- DIAGNOSTIC QUERIES: Payment Proof Persistence Issue
-- =====================================================
-- Run these queries to diagnose why payment proofs
-- disappear after page reload despite successful upload.
-- =====================================================

-- STEP 1: Check if records exist in payment_proofs table
-- This will show ALL records regardless of RLS
-- (Run as admin or disable RLS temporarily)
SELECT 
  id,
  user_id,
  property_id,
  month_year,
  amount,
  status,
  created_at,
  proof_url
FROM public.payment_proofs
ORDER BY created_at DESC
LIMIT 10;

-- STEP 2: Check current RLS policies on payment_proofs table
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename = 'payment_proofs'
ORDER BY policyname;

-- STEP 3: Check storage bucket policies
SELECT 
  policyname,
  cmd,
  roles
FROM pg_policies
WHERE schemaname = 'storage' 
  AND tablename = 'objects'
  AND policyname LIKE '%payment%'
ORDER BY policyname;

-- STEP 4: Verify files exist in storage bucket
SELECT 
  name,
  bucket_id,
  owner,
  created_at,
  updated_at,
  last_accessed_at,
  metadata
FROM storage.objects
WHERE bucket_id = 'payment-proofs'
ORDER BY created_at DESC
LIMIT 10;

-- STEP 5: Check for duplicate or conflicting policies
-- This will show if there are multiple SELECT policies that might conflict
SELECT 
  policyname,
  cmd,
  CASE 
    WHEN cmd = 'SELECT' THEN 'READ'
    WHEN cmd = 'INSERT' THEN 'WRITE'
    WHEN cmd = 'UPDATE' THEN 'MODIFY'
    WHEN cmd = 'DELETE' THEN 'REMOVE'
  END as operation,
  COUNT(*) OVER (PARTITION BY cmd) as policy_count_for_operation
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename = 'payment_proofs';

-- =====================================================
-- EXPECTED RESULTS:
-- =====================================================
-- STEP 1: Should show recent payment proof records
--   - If empty: Records are not being inserted
--   - If has records: RLS is blocking SELECT queries
--
-- STEP 2: Should show 4 policies:
--   - "Users can upload their own proofs" (INSERT)
--   - "Users can view their own proofs" (SELECT)
--   - "Admins can view all proofs" (SELECT)
--   - "Admins can update proofs" (UPDATE)
--
-- STEP 3: Should show 4 storage policies:
--   - "Users can upload payment proofs to own folder" (INSERT)
--   - "Anyone can view payment proofs" (SELECT)
--   - "Only owner or admin can update payment proofs" (UPDATE)
--   - "Only admins can delete payment proofs" (DELETE)
--
-- STEP 4: Should show uploaded files in vouchers/{user_id}/ folder
--   - If empty after upload: Storage policies are blocking INSERT
--   - If files exist but disappear: Storage policies allowing DELETE
--
-- STEP 5: Should show policy_count_for_operation
--   - SELECT should have 2 (one for users, one for admins)
--   - INSERT should have 1
--   - UPDATE should have 1
--   - DELETE should have 0 (only admins can delete via storage policies)
-- =====================================================
