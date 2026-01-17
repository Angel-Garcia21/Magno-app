-- Fix Admin Access to Signed Documents
-- This script ensures that admin users can view ALL documents in the signed_documents table

-- 1. Drop existing policies to start fresh
DROP POLICY IF EXISTS "Universal Access for Authenticated Users" ON public.signed_documents;
DROP POLICY IF EXISTS "Admin Full Access" ON public.signed_documents;
DROP POLICY IF EXISTS "User Own Documents Access" ON public.signed_documents;

-- 2. Create Admin Full Access Policy
-- Admins can see and manage ALL documents
CREATE POLICY "Admin Full Access"
ON public.signed_documents
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- 3. Create User Access Policy
-- Regular users (owners/tenants) can only see their own documents
CREATE POLICY "User Own Documents Access"
ON public.signed_documents
FOR ALL
TO authenticated
USING (
  user_id = auth.uid()
  OR
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
)
WITH CHECK (
  user_id = auth.uid()
  OR
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- 4. Ensure RLS is enabled
ALTER TABLE public.signed_documents ENABLE ROW LEVEL SECURITY;

-- 5. Grant necessary permissions
GRANT ALL ON public.signed_documents TO authenticated;
GRANT ALL ON public.signed_documents TO service_role;

-- 6. Verify the admin user's role
-- Run this to check if your admin user has the correct role:
-- SELECT id, email, role FROM public.profiles WHERE email = 'angel.garcia@magnogi.com';

-- If the role is not 'admin', update it:
UPDATE public.profiles 
SET role = 'admin' 
WHERE email = 'angel.garcia@magnogi.com';
