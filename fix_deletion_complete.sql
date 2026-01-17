-- FIX DELETION ISSUES v2 (COMPLETE)
-- This script does 4 things:
-- 1. Creates 'rejected_payments' table if missing.
-- 2. Creates 'signed_documents' table if missing (CRITICAL FIX).
-- 3. Updates 'delete_property_by_admin' to handle all dependencies properly.
-- 4. Creates 'delete_user_by_admin' to handle user deletion cascading.

-- 1. Create rejected_payments table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.rejected_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    month_year TEXT NOT NULL,
    amount NUMERIC(10, 2),
    proof_url TEXT NOT NULL,
    rejected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    rejected_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    rejection_reason TEXT,
    originally_submitted_at TIMESTAMPTZ,
    original_payment_proof_id UUID,
    CONSTRAINT rejected_payments_unique_month UNIQUE (user_id, property_id, month_year, rejected_at)
);

CREATE INDEX IF NOT EXISTS idx_rejected_payments_user ON rejected_payments(user_id);
CREATE INDEX IF NOT EXISTS idx_rejected_payments_property ON rejected_payments(property_id);
ALTER TABLE public.rejected_payments ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, DELETE ON public.rejected_payments TO authenticated;


-- 2. Create signed_documents table if it doesn't exist (CRITICAL FOR PDF DELETION)
CREATE TABLE IF NOT EXISTS public.signed_documents (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  property_id uuid REFERENCES public.properties(id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  document_type text NOT NULL CHECK (document_type IN ('recruitment', 'keys', 'contract')),
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'signed')),
  signature_url text, 
  pdf_url text,
  signed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.signed_documents ENABLE ROW LEVEL SECURITY;

-- Add RLS policies for signed_documents if they don't exist (using DO block to avoid errors if policies exist)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'signed_documents' AND policyname = 'Users can view their own signed documents') THEN
        CREATE POLICY "Users can view their own signed documents" ON public.signed_documents FOR SELECT USING (auth.uid() = user_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'signed_documents' AND policyname = 'Users can insert signed documents') THEN
        CREATE POLICY "Users can insert signed documents" ON public.signed_documents FOR INSERT WITH CHECK (auth.uid() = user_id);
    END IF;

     IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'signed_documents' AND policyname = 'Users can update their own signed documents') THEN
        CREATE POLICY "Users can update their own signed documents" ON public.signed_documents FOR UPDATE USING (auth.uid() = user_id);
    END IF;
END $$;


-- 3. Update delete_property_by_admin (Handles "rejected_payments" and "signed_documents" clean up)
CREATE OR REPLACE FUNCTION delete_property_by_admin(target_property_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Verify caller is admin
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Only admins can delete properties';
  END IF;

  -- Delete related records explicitly to avoid any FK issues if Cascades are missing
  
  -- Timeline
  DELETE FROM public.timeline_events WHERE property_id = target_property_id;
  
  -- Payments
  DELETE FROM public.payment_proofs WHERE property_id = target_property_id;
  DELETE FROM public.rejected_payments WHERE property_id = target_property_id; -- Now safe
  
  -- Applications, Docs & Appointments
  DELETE FROM public.rental_applications WHERE property_id = target_property_id;
  DELETE FROM public.signed_documents WHERE property_id = target_property_id;
  DELETE FROM public.reports WHERE property_id = target_property_id;
  DELETE FROM public.appointments WHERE property_id = target_property_id; -- ADDED

  -- Delete the property
  DELETE FROM public.properties WHERE id = target_property_id;
END;
$$;

GRANT EXECUTE ON FUNCTION delete_property_by_admin(UUID) TO authenticated;


-- 4. Create delete_user_by_admin (Fixes "Violates Foreign Key" on Profiles delete)
CREATE OR REPLACE FUNCTION delete_user_by_admin(target_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  prop RECORD;
BEGIN
  -- Verify admin
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Only admins can delete users';
  END IF;

  -- A. Delete all properties owned by this user first
  -- We loop through them and use the property deletion logic to ensure clean cleanup
  FOR prop IN SELECT id FROM public.properties WHERE owner_id = target_user_id LOOP
    PERFORM delete_property_by_admin(prop.id);
  END LOOP;

  -- B. Delete other user-specific orphans
  DELETE FROM public.notifications WHERE user_id = target_user_id;
  DELETE FROM public.rental_applications WHERE applicant_id = target_user_id;
  DELETE FROM public.payment_proofs WHERE user_id = target_user_id; 
  DELETE FROM public.rejected_payments WHERE user_id = target_user_id;
  DELETE FROM public.signed_documents WHERE user_id = target_user_id;

  -- C. Delete the Profile
  -- This will now work because no properties explicitly reference this user as owner anymore
  DELETE FROM public.profiles WHERE id = target_user_id;

END;
$$;

GRANT EXECUTE ON FUNCTION delete_user_by_admin(UUID) TO authenticated;
