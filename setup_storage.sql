-- 1. Create the 'report-images' bucket (Public)
INSERT INTO storage.buckets (id, name, public)
VALUES ('report-images', 'report-images', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 2. Remove existing policies to avoid conflicts
DROP POLICY IF EXISTS "Authenticated users can upload images" ON storage.objects;
DROP POLICY IF EXISTS "Everyone can view images" ON storage.objects;

-- 3. Policy: Allow any authenticated user to upload to this bucket
CREATE POLICY "Authenticated users can upload images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'report-images');

-- 4. Policy: Allow everyone (public) to view/download images from this bucket
CREATE POLICY "Everyone can view images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'report-images');
