-- Comprehensive Storage Fix for Magno Inmobiliaria
-- 1. Create necessary buckets
INSERT INTO storage.buckets (id, name, public)
VALUES 
  ('media', 'media', true),
  ('properties', 'properties', true),
  ('documents', 'documents', true)
ON CONFLICT (id) DO NOTHING;

-- 2. General Public/Select access for viewing
DROP POLICY IF EXISTS "Public Select Media" ON storage.objects;
CREATE POLICY "Public Select Media" ON storage.objects FOR SELECT USING (bucket_id = 'media');

DROP POLICY IF EXISTS "Public Select Properties" ON storage.objects;
CREATE POLICY "Public Select Properties" ON storage.objects FOR SELECT USING (bucket_id = 'properties');

DROP POLICY IF EXISTS "Public Select Documents" ON storage.objects;
CREATE POLICY "Public Select Documents" ON storage.objects FOR SELECT USING (bucket_id = 'documents');

-- 3. Team Upload Policies (Admin, Asesor, Marketing)
-- We use a single policy per action for simplicity, checking the profiles table.

-- INSERT
DROP POLICY IF EXISTS "Team Insert Media" ON storage.objects;
CREATE POLICY "Team Insert Media" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'media' AND
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'asesor', 'marketing'))
);

DROP POLICY IF EXISTS "Team Insert Properties" ON storage.objects;
CREATE POLICY "Team Insert Properties" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'properties' AND
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'asesor', 'marketing'))
);

-- UPDATE
DROP POLICY IF EXISTS "Team Update Media" ON storage.objects;
CREATE POLICY "Team Update Media" ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'media' AND
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'asesor', 'marketing'))
);

DROP POLICY IF EXISTS "Team Update Properties" ON storage.objects;
CREATE POLICY "Team Update Properties" ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'properties' AND
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'asesor', 'marketing'))
);

-- 4. Document Specific Policies (Private Folders)
-- Usually documents are in folders named by uid? 
-- But for simplicity for the team, we allow them to manage based on roles too.

DROP POLICY IF EXISTS "Team Manage Documents" ON storage.objects;
CREATE POLICY "Team Manage Documents" ON storage.objects FOR ALL TO authenticated
USING (
  bucket_id = 'documents' AND
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'asesor', 'marketing'))
)
WITH CHECK (
  bucket_id = 'documents' AND
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'asesor', 'marketing'))
);
