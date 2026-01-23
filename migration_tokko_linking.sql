-- Migration to support Tokko Manual Linking Workflow

-- 1. Add linked_property_id column
ALTER TABLE public.property_submissions 
ADD COLUMN IF NOT EXISTS linked_property_id UUID REFERENCES public.properties(id) ON DELETE SET NULL;

-- 2. Update status check constraint
-- First, drop the old constraint if it exists
DO $$ 
BEGIN 
    ALTER TABLE public.property_submissions DROP CONSTRAINT IF EXISTS property_submissions_status_check;
EXCEPTION
    WHEN undefined_object THEN null;
END $$;

-- Add the new constraint with 'published'
ALTER TABLE public.property_submissions 
ADD CONSTRAINT property_submissions_status_check 
CHECK (status IN ('draft', 'pending', 'changes_requested', 'approved', 'rejected', 'published'));

-- 3. Update signed_documents to allow linking to submissions
ALTER TABLE public.signed_documents
ADD COLUMN IF NOT EXISTS submission_id UUID REFERENCES public.property_submissions(id) ON DELETE CASCADE;

-- 3. Update existing records? 
-- No need, 'approved' is already a valid status. We'll transition to 'published' manually.
