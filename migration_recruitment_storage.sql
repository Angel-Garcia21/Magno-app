
-- Migration: Setup Storage for Property Recruitment (Media Bucket)

-- 1. Ensure the 'media' bucket exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('media', 'media', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 2. Allow authenticated users to upload their own property images/docs
-- Path format: properties/owners/{user_id}/...
CREATE POLICY "Users can upload their own recruitment media"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'media' AND 
    (storage.foldername(name))[1] = 'properties' AND
    (storage.foldername(name))[2] = 'owners' AND
    (storage.foldername(name))[3] = auth.uid()::text
);

-- 3. Allow owners to update/delete their own media
CREATE POLICY "Users can update their own recruitment media"
ON storage.objects FOR UPDATE
TO authenticated
USING (
    bucket_id = 'media' AND 
    (storage.foldername(name))[3] = auth.uid()::text
);

CREATE POLICY "Users can delete their own recruitment media"
ON storage.objects FOR DELETE
TO authenticated
USING (
    bucket_id = 'media' AND 
    (storage.foldername(name))[3] = auth.uid()::text
);

-- 4. Allow public to view property images (Selection)
CREATE POLICY "Public can view property images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'media');

-- 5. Give Admins full control over the media bucket
CREATE POLICY "Admins have full access to media bucket"
ON storage.objects FOR ALL
TO authenticated
USING (
    bucket_id = 'media' AND
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND role = 'admin'
    )
);
