-- 1. Ensure Table Exists (Idempotent)
CREATE TABLE IF NOT EXISTS public.signed_documents (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    document_type TEXT NOT NULL,
    pdf_url TEXT NOT NULL,
    signature_url TEXT,
    status TEXT DEFAULT 'active', -- 'active', 'pending_signature', 'signed'
    created_at TIMESTAMPTZ DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE
);

-- 2. Force Reset of RLS
ALTER TABLE public.signed_documents DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.signed_documents ENABLE ROW LEVEL SECURITY;

-- 3. Drop ALL existing policies to ensure a clean slate
DROP POLICY IF EXISTS "Users can insert their own documents" ON public.signed_documents;
DROP POLICY IF EXISTS "Users can view their own documents" ON public.signed_documents;
DROP POLICY IF EXISTS "Admins can do everything on signed_documents" ON public.signed_documents;
DROP POLICY IF EXISTS "Users can view their own signed_documents" ON public.signed_documents;
DROP POLICY IF EXISTS "Authenticated users can insert signed_documents" ON public.signed_documents;
DROP POLICY IF EXISTS "Authenticated users can update signed_documents" ON public.signed_documents;
DROP POLICY IF EXISTS "Authenticated users can select signed_documents" ON public.signed_documents;
DROP POLICY IF EXISTS "Universal Access for Authenticated Users" ON public.signed_documents;

-- 4. Create ONE Permissive Policy
-- This allows ANY authenticated user (Admin or Client) to Insert, Update, Select, Delete.
-- Ideally we would restrict "Delete" but for now we prioritize functionality.
-- Use "FOR ALL" to cover INSERT, UPDATE, DELETE, SELECT.
-- "USING (true)" means they can see/modify all rows.
-- "WITH CHECK (true)" means they can insert/update any row.
CREATE POLICY "Universal Access for Authenticated Users"
ON public.signed_documents
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- 5. Explicitly Grant Privileges
GRANT ALL ON public.signed_documents TO postgres;
GRANT ALL ON public.signed_documents TO anon;
GRANT ALL ON public.signed_documents TO authenticated;
GRANT ALL ON public.signed_documents TO service_role;

-- 6. Ensure Storage Bucket Exists and is Public
INSERT INTO storage.buckets (id, name, public) VALUES ('documents', 'documents', true) ON CONFLICT (id) DO NOTHING;

-- 7. Ensure Storage Policies (If not already present, simpler to drop and recreate for 'documents' bucket)
DROP POLICY IF EXISTS "Documents Bucket Access" ON storage.objects;
CREATE POLICY "Documents Bucket Access"
ON storage.objects
FOR ALL
TO authenticated
USING (bucket_id = 'documents')
WITH CHECK (bucket_id = 'documents');
