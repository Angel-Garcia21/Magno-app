-- Function to allow admins to delete users from auth.users
-- This is necessary because the client-side Supabase client cannot delete auth users directly.
-- WARNING: This function has SECURITY DEFINER, meaning it runs with superuser privileges.
-- We include a strict check to ensure only authenticated admins can use it.

CREATE OR REPLACE FUNCTION delete_user_by_admin(target_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- 1. Check if the person calling this function is an admin in public.profiles
  IF EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  ) THEN
    -- 2. Delete from public.profiles first (to be safe, though cascade should handle it)
    DELETE FROM public.profiles WHERE id = target_user_id;
    
    -- 3. Delete from auth.users (this fully removes the account)
    DELETE FROM auth.users WHERE id = target_user_id;
  ELSE
    RAISE EXCEPTION 'Solo los administradores pueden realizar esta acción.';
  END IF;
END;
$$;

-- Grant access to the function for authenticated users
GRANT EXECUTE ON FUNCTION delete_user_by_admin(uuid) TO authenticated;
