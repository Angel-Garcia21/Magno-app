-- 1. Create the table because it doesn't exist
CREATE TABLE IF NOT EXISTS public.signed_documents (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    document_type TEXT NOT NULL, -- 'recruitment' or 'key_receipt'
    pdf_url TEXT NOT NULL,
    signature_url TEXT, -- Can be null initially if pending
    status TEXT DEFAULT 'active', -- 'active', 'pending_signature', 'signed'
    created_at TIMESTAMPTZ DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE
);

-- 2. Enable RLS
ALTER TABLE public.signed_documents ENABLE ROW LEVEL SECURITY;

-- 3. Drop existing policies to avoid conflicts or confusion (if any partials existed)
DROP POLICY IF EXISTS "Users can insert their own documents" ON public.signed_documents;
DROP POLICY IF EXISTS "Users can view their own documents" ON public.signed_documents;
DROP POLICY IF EXISTS "Admins can do everything on signed_documents" ON public.signed_documents;
DROP POLICY IF EXISTS "Users can view their own signed_documents" ON public.signed_documents;
DROP POLICY IF EXISTS "Authenticated users can insert signed_documents" ON public.signed_documents;
DROP POLICY IF EXISTS "Authenticated users can update signed_documents" ON public.signed_documents;
DROP POLICY IF EXISTS "Authenticated users can select signed_documents" ON public.signed_documents;

-- 4. Create comprehensive policies

-- Allow users to view their own documents
CREATE POLICY "Users can view their own signed_documents"
ON public.signed_documents
FOR SELECT
USING (auth.uid() = user_id);

-- Allow authenticated users (Admin) to INSERT documents (e.g. for a user)
CREATE POLICY "Authenticated users can insert signed_documents"
ON public.signed_documents
FOR INSERT
WITH CHECK (auth.role() = 'authenticated');

-- Allow authenticated users to UPDATE (Sign, Change Status)
CREATE POLICY "Authenticated users can update signed_documents"
ON public.signed_documents
FOR UPDATE
USING (auth.role() = 'authenticated');

-- Allow authenticated users to SELECT (Admin dashboard visibility)
CREATE POLICY "Authenticated users can select signed_documents"
ON public.signed_documents
FOR SELECT
USING (auth.role() = 'authenticated');

-- 5. Grant permissions just in case
GRANT ALL ON public.signed_documents TO postgres;
GRANT ALL ON public.signed_documents TO anon;
GRANT ALL ON public.signed_documents TO authenticated;
GRANT ALL ON public.signed_documents TO service_role;
