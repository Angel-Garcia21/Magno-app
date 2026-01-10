-- 1. Correct the trigger function to capture the role from metadata
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id, 
    new.email, 
    new.raw_user_meta_data->>'full_name', 
    coalesce(new.raw_user_meta_data->>'role', 'guest')
  );
  return new;
end;
$$ language plpgsql security definer;

-- 2. Fix existing "guest" or NULL users by pulling the role from their auth metadata (if it exists)
update public.profiles
set 
  role = coalesce(
    (select raw_user_meta_data->>'role' from auth.users where auth.users.id = public.profiles.id),
    role,
    'guest'
  )
where role = 'guest' or role is null;

-- 3. MANUAL OVERRIDE (Use this for users created before the fix that are still 'guest')
-- Cambia 'owner' por 'tenant' según corresponda
UPDATE public.profiles 
SET role = 'owner' 
WHERE email = 'angel.programador21@gmail.com'; 

-- 4. Safety check: List users that are still guests or null
select id, email, full_name, role from public.profiles where role = 'guest' or role is null;
