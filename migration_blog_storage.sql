-- Migration: Setup Blog Storage Bucket (media)
-- This fixes the "BUCKET NOT FOUND" error when uploading blog images.

-- 1. Create the 'media' bucket if it doesn't exist (Public)
INSERT INTO storage.buckets (id, name, public)
VALUES ('media', 'media', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 2. Policy: Allow public read access to 'media' bucket
DROP POLICY IF EXISTS "Media Public Read Access" ON storage.objects;
CREATE POLICY "Media Public Read Access"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'media');

-- 3. Policy: Allow admins to upload to 'media' bucket
DROP POLICY IF EXISTS "Media Admin Upload Access" ON storage.objects;
CREATE POLICY "Media Admin Upload Access"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'media' AND
    (EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    ))
);

-- 4. Policy: Allow admins to update objects in 'media' bucket
DROP POLICY IF EXISTS "Media Admin Update Access" ON storage.objects;
CREATE POLICY "Media Admin Update Access"
ON storage.objects FOR UPDATE
TO authenticated
USING (
    bucket_id = 'media' AND
    (EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    ))
);

-- 5. Policy: Allow admins to delete objects in 'media' bucket
DROP POLICY IF EXISTS "Media Admin Delete Access" ON storage.objects;
CREATE POLICY "Media Admin Delete Access"
ON storage.objects FOR DELETE
TO authenticated
USING (
    bucket_id = 'media' AND
    (EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    ))
);
