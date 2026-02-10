-- Function to allow updating lead status securely (bypassing RLS for specific action)
-- Run this in your Supabase SQL Editor

create or replace function update_lead_status_secure(lead_id uuid, new_status text)
returns void
language plpgsql
security definer -- This runs with the privileges of the creator (admin), bypassing user RLS
as $$
begin
  update leads_prospectos
  set status = new_status,
      updated_at = now()
  where id = lead_id;
end;
$$;
