-- Trigger to create a profile automatically when a new user signs up via Auth
-- UPDATED: Forces 'admin' role for specific emails
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data ->> 'full_name',
    case 
      -- Helper logic to auto-assign admin role to specific company emails
      when new.email in ('angel.garcia@magnogi.com', 'alejandro.rivas@magnogi.com') then 'admin'
      -- Otherwise use the requested role or default to guest
      else coalesce(new.raw_user_meta_data ->> 'role', 'guest')
    end
  );
  return new;
end;
$$;

-- Create the trigger (if not already created, or replace it)
create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
