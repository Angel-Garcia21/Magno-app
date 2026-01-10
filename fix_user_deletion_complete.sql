-- Comprehensive fix for user deletion handling ALL foreign key constraints
-- This updates delete_user_by_admin to unlink/delete all related records

CREATE OR REPLACE FUNCTION delete_user_by_admin(target_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if caller is admin
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Only admins can delete users';
  END IF;

  -- 1. Delete rental/sale applications submitted by this user
  DELETE FROM public.rental_applications
  WHERE user_id = target_user_id;

  -- 2. Delete property submissions (recruitment) by this user
  DELETE FROM public.property_submissions
  WHERE owner_id = target_user_id;

  -- 3. Delete reports created by this user
  DELETE FROM public.reports
  WHERE user_id = target_user_id;

  -- 4. Delete payment proofs submitted by this user
  DELETE FROM public.payment_proofs
  WHERE user_id = target_user_id;

  -- 5. Delete appraisals requested by this user
  DELETE FROM public.appraisals
  WHERE user_id = target_user_id;

  -- 6. Delete appointments for this user
  DELETE FROM public.appointments
  WHERE user_id = target_user_id;

  -- 7. Unlink regular properties owned by this user (set owner_id to NULL)
  UPDATE public.properties
  SET owner_id = NULL
  WHERE owner_id = target_user_id;

  -- 8. Unlink internal properties owned by this user (set owner_id to NULL)
  UPDATE public.internal_properties
  SET owner_id = NULL
  WHERE owner_id = target_user_id;

  -- 9. Delete from public.profiles (this will cascade to other tables with ON DELETE CASCADE)
  DELETE FROM public.profiles
  WHERE id = target_user_id;

  -- 10. Delete from auth.users (requires service_role, may fail gracefully)
  BEGIN
    DELETE FROM auth.users
    WHERE id = target_user_id;
  EXCEPTION
    WHEN insufficient_privilege THEN
      RAISE NOTICE 'Could not delete from auth.users (insufficient privileges), but profile was deleted';
  END;
END;
$$;

-- Grant execute permission to authenticated users (the function itself checks for admin role)
GRANT EXECUTE ON FUNCTION delete_user_by_admin(UUID) TO authenticated;
