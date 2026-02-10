-- 1. Create 'media' bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('media', 'media', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Allow any authenticated user to upload to 'media' bucket (blog images)
DROP POLICY IF EXISTS "Public access to media bucket" ON storage.objects;
CREATE POLICY "Public access to media bucket"
ON storage.objects FOR SELECT
USING (bucket_id = 'media');

DROP POLICY IF EXISTS "Team can upload blog images" ON storage.objects;
CREATE POLICY "Team can upload blog images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'media'
);

DROP POLICY IF EXISTS "Team can update blog images" ON storage.objects;
CREATE POLICY "Team can update blog images"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'media');

-- 3. Function to verify user password (for the blog author verification)
-- Note: This is a secure wrapper that checks if a password is valid for a given email
-- This requires the 'pgcrypto' extension in some environments, but Supabase auth handles it differently.
-- Since we can't easily check auth.users passwords from public schema, 
-- we will use a dedicated RPC that attempts to sign in (logic handled in Frontend).
-- HOWEVER, to avoid session switching, we can create a simpler check if the user wants.
-- FOR NOW: I will ensure the 'media' bucket has policy for 'asesor' and 'marketing' roles specifically.

DROP POLICY IF EXISTS "Allow team roles to upload to media" ON storage.objects;
CREATE POLICY "Allow team roles to upload to media"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'media' AND
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('admin', 'asesor', 'marketing')
  )
);
