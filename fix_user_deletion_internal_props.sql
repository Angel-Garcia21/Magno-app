-- Fix user deletion to handle ALL foreign key constraints
-- This updates the delete_user_by_admin function to unlink both properties and internal_properties

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

  -- 1. Unlink regular properties from this user (set owner_id to NULL)
  UPDATE public.properties
  SET owner_id = NULL
  WHERE owner_id = target_user_id;

  -- 2. Unlink internal properties from this user (set owner_id to NULL)
  UPDATE public.internal_properties
  SET owner_id = NULL
  WHERE owner_id = target_user_id;

  -- 3. Delete from public.profiles (this will cascade to other tables with ON DELETE CASCADE)
  DELETE FROM public.profiles
  WHERE id = target_user_id;

  -- 4. Delete from auth.users (requires service_role, may fail gracefully)
  BEGIN
    DELETE FROM auth.users
    WHERE id = target_user_id;
  EXCEPTION
    WHEN insufficient_privilege THEN
      -- If we don't have permission to delete from auth.users, that's okay
      -- The profile deletion is the most important part
      RAISE NOTICE 'Could not delete from auth.users (insufficient privileges), but profile was deleted';
  END;
END;
$$;

-- Grant execute permission to authenticated users (the function itself checks for admin role)
GRANT EXECUTE ON FUNCTION delete_user_by_admin(UUID) TO authenticated;
