-- SQL Migration: Add fields for Investigation Payment Proofs and Metadata
-- Table: leads_prospectos (already exists, adding metadata columns)

-- 1. Ensure columns exist for payment proofs and investigation links
ALTER TABLE leads_prospectos 
ADD COLUMN IF NOT EXISTS payment_proof_url TEXT,
ADD COLUMN IF NOT EXISTS payment_method TEXT, -- 'transfer' or 'cashless_withdrawal'
ADD COLUMN IF NOT EXISTS investigation_link TEXT,
ADD COLUMN IF NOT EXISTS investigation_notes TEXT;

-- 2. Add a comment for better DX
COMMENT ON COLUMN leads_prospectos.payment_method IS 'Method of investigation payment: transfer or cashless_withdrawal';

-- 3. Storage Policies for 'media' bucket (if not already set)
-- Ensure 'media' bucket exists
-- INSERT INTO storage.buckets (id, name, public) VALUES ('media', 'media', true) ON CONFLICT (id) DO NOTHING;

-- Allow advisors to upload their own payment proofs
-- CREATE POLICY "Advisors can upload investigation proofs" 
-- ON storage.objects FOR INSERT 
-- WITH CHECK (bucket_id = 'media' AND auth.role() = 'authenticated');

-- Allow everyone to read media (if bucket is public)
-- CREATE POLICY "Public read access for media" 
-- ON storage.objects FOR SELECT 
-- USING (bucket_id = 'media');
