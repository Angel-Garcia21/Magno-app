-- ROBUST USER DELETION v3 (Final - Error Resilient)
-- This version uses dynamic SQL to prevent "Column does not exist" errors
-- and handles email-based unlinking for tables without direct UUID refs.

CREATE OR REPLACE FUNCTION delete_user_by_admin_v2(
  target_user_id UUID,
  purge_assets BOOLEAN DEFAULT FALSE
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  target_email TEXT;
  prop RECORD;
  col_exists BOOLEAN;
BEGIN
  -- 1. Admin Verification
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Solo administradores pueden eliminar usuarios';
  END IF;

  -- 2. Get User Email for cross-referencing
  SELECT email INTO target_email FROM public.profiles WHERE id = target_user_id;

  -- 3. Handle Properties & Internal Properties
  IF purge_assets THEN
    -- A. Public Properties (Using existing delete function)
    FOR prop IN SELECT id FROM public.properties WHERE owner_id = target_user_id OR tenant_id = target_user_id LOOP
      PERFORM delete_property_by_admin(prop.id);
    END LOOP;
    
    -- B. Internal Properties
    FOR prop IN SELECT id FROM public.internal_properties WHERE owner_id = target_user_id OR tenant_id = target_user_id LOOP
      -- Safe deletion of dependencies for internal properties
      DELETE FROM public.timeline_events WHERE property_id = prop.id; -- Note: Some might use internal_property_id
      
      -- Check if internal_property_id column exists in dependencies before deleting
      SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='payment_proofs' AND column_name='internal_property_id') INTO col_exists;
      IF col_exists THEN
        EXECUTE 'DELETE FROM public.payment_proofs WHERE internal_property_id = $1' USING prop.id;
      END IF;

      SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='reports' AND column_name='internal_property_id') INTO col_exists;
      IF col_exists THEN
        EXECUTE 'DELETE FROM public.reports WHERE internal_property_id = $1' USING prop.id;
      END IF;

      DELETE FROM public.internal_properties WHERE id = prop.id;
    END LOOP;

  ELSE
    -- SOFT UNLINK: Set owner/tenant to NULL
    UPDATE public.properties SET owner_id = NULL WHERE owner_id = target_user_id;
    UPDATE public.properties SET tenant_id = NULL WHERE tenant_id = target_user_id;
    UPDATE public.internal_properties SET owner_id = NULL WHERE owner_id = target_user_id;
    UPDATE public.internal_properties SET tenant_id = NULL WHERE tenant_id = target_user_id;
  END IF;

  -- 4. Generic Dependencies Cleanup (Safe dynamic deletion)
  
  -- Notifications
  SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='notifications' AND column_name='user_id') INTO col_exists;
  IF col_exists THEN EXECUTE 'DELETE FROM public.notifications WHERE user_id = $1' USING target_user_id; END IF;

  -- Payment Proofs
  SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='payment_proofs' AND column_name='user_id') INTO col_exists;
  IF col_exists THEN EXECUTE 'DELETE FROM public.payment_proofs WHERE user_id = $1' USING target_user_id; END IF;

  -- Rejected Payments
  SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='rejected_payments' AND column_name='user_id') INTO col_exists;
  IF col_exists THEN EXECUTE 'DELETE FROM public.rejected_payments WHERE user_id = $1' USING target_user_id; END IF;

  -- Signed Documents
  SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='signed_documents' AND column_name='user_id') INTO col_exists;
  IF col_exists THEN EXECUTE 'DELETE FROM public.signed_documents WHERE user_id = $1' USING target_user_id; END IF;

  -- Reports (Maintenance)
  SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='reports' AND column_name='user_id') INTO col_exists;
  IF col_exists THEN EXECUTE 'DELETE FROM public.reports WHERE user_id = $1' USING target_user_id; END IF;

  -- Property Submissions (Recruitment)
  SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='property_submissions' AND column_name='owner_id') INTO col_exists;
  IF col_exists THEN EXECUTE 'DELETE FROM public.property_submissions WHERE owner_id = $1' USING target_user_id; END IF;

  -- 5. Email-based cleanup (for tables with no UUID link)
  IF target_email IS NOT NULL THEN
    -- Rental Applications
    DELETE FROM public.rental_applications WHERE email = target_email;
    -- Appointments
    SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='appointments' AND column_name='client_email') INTO col_exists;
    IF col_exists THEN EXECUTE 'DELETE FROM public.appointments WHERE client_email = $1' USING target_email; END IF;
  END IF;

  -- 6. FINAL DELETION: Profiles & Auth
  DELETE FROM public.profiles WHERE id = target_user_id;
  
  BEGIN
    DELETE FROM auth.users WHERE id = target_user_id;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Auth user deletion skipped (expected for service_role issues)';
  END;

END;
$$;

GRANT EXECUTE ON FUNCTION delete_user_by_admin_v2(UUID, BOOLEAN) TO authenticated;
