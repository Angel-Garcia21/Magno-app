-- =====================================================
-- VERIFY USER ID MISMATCH
-- =====================================================
-- This query will help identify if there's a mismatch
-- between the user_id in payment_proofs and profiles
-- =====================================================

-- 1. Show all user_ids that have payment proofs
SELECT DISTINCT 
  pp.user_id as payment_proof_user_id,
  p.id as profile_id,
  p.name as profile_name,
  p.email as profile_email,
  p.role as profile_role,
  CASE 
    WHEN pp.user_id = p.id THEN '✅ MATCH'
    ELSE '❌ MISMATCH'
  END as id_status
FROM public.payment_proofs pp
LEFT JOIN public.profiles p ON pp.user_id = p.id
ORDER BY pp.user_id;

-- 2. Show payment proofs with user details
SELECT 
  pp.id,
  pp.user_id,
  pp.month_year,
  pp.amount,
  pp.status,
  pp.created_at,
  p.name as user_name,
  p.email as user_email
FROM public.payment_proofs pp
LEFT JOIN public.profiles p ON pp.user_id = p.id
ORDER BY pp.created_at DESC
LIMIT 10;

-- 3. Check if user_id matches auth.uid() for the current logged-in user
-- (This simulates what the frontend query does)
SELECT 
  pp.*,
  auth.uid() as current_auth_uid,
  CASE 
    WHEN pp.user_id = auth.uid() THEN '✅ Would Load'
    ELSE '❌ Would NOT Load'
  END as frontend_visibility
FROM public.payment_proofs pp
ORDER BY pp.created_at DESC
LIMIT 10;

-- =====================================================
-- HOW TO USE THESE QUERIES:
-- =====================================================
-- 1. Login to your app as the tenant user who uploaded the payment proof
-- 2. Run query #3 above in Supabase SQL Editor
-- 3. Check the "frontend_visibility" column
--    - If "✅ Would Load" → RLS policies are working correctly
--    - If "❌ Would NOT Load" → There's a user_id mismatch
-- =====================================================
