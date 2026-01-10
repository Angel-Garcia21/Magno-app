-- Add a stored procedure to handle property deletion and all its dependencies
CREATE OR REPLACE FUNCTION delete_property_by_admin(target_property_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- 1. Verify caller is admin
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Only admins can delete properties';
  END IF;

  -- 2. Delete related records in dependent tables
  
  -- a) Timeline Events
  DELETE FROM public.timeline_events
  WHERE property_id = target_property_id;

  -- b) Payment Proofs
  DELETE FROM public.payment_proofs
  WHERE property_id = target_property_id;

  -- c) Rejected Payments
  DELETE FROM public.rejected_payments
  WHERE property_id = target_property_id;

  -- d) Rental Applications (Sale or Rent)
  DELETE FROM public.rental_applications
  WHERE property_id = target_property_id;

  -- e) Reports (Set to null instead of deleting to keep history if needed, or delete)
  -- For now, let's delete them to be strictly clean
  DELETE FROM public.reports
  WHERE property_id = target_property_id;

  -- 3. Delete the property itself
  DELETE FROM public.properties
  WHERE id = target_property_id;

END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION delete_property_by_admin(UUID) TO authenticated;
