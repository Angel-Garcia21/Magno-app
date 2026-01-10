-- =====================================================
-- EMERGENCY DIAGNOSTIC: Why is SELECT still returning 0?
-- =====================================================
-- Run this while logged in as the tenant user
-- =====================================================

-- 1. Check what auth.uid() returns for current session
SELECT auth.uid() as current_auth_uid;

-- 2. Check if this user can see ANY payment_proofs at all
-- (This tests if RLS policies are working)
SELECT 
  COUNT(*) as total_visible_proofs,
  auth.uid() as my_auth_uid
FROM public.payment_proofs;

-- 3. Show all payment_proofs with RLS evaluation
SELECT 
  pp.id,
  pp.user_id,
  pp.month_year,
  pp.amount,
  pp.status,
  auth.uid() as current_user,
  (auth.uid() = pp.user_id) as "should_be_visible",
  (auth.uid()::text) as "auth_uid_text",
  (pp.user_id::text) as "record_user_id_text"
FROM public.payment_proofs pp;

-- 4. Check profile to see if user has correct role
SELECT 
  id,
  email,
  name,
  role,
  auth.uid() as current_auth_uid,
  (id = auth.uid()) as "is_current_user"
FROM public.profiles
WHERE id = auth.uid();

-- =====================================================
-- INSTRUCTIONS:
-- =====================================================
-- 1. Login to the app as the TENANT user
-- 2. Open Supabase SQL Editor
-- 3. Run each query above ONE AT A TIME
-- 4. Share the results with me
--
-- Pay special attention to:
-- - Does query #1 return the UUID 7898b1d2-92b4-48fc-96f4-5e107e5ce20e?
-- - Does query #2 return total_visible_proofs > 0?
-- - Does query #3 show "should_be_visible" = true?
-- =====================================================
