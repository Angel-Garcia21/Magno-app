-- Reset RLS for payment_proofs to ensure clear access rules

-- 1. Drop existing policies to avoid conflicts/duplicates
drop policy if exists "Users can upload their own proofs" on public.payment_proofs;
drop policy if exists "Users can view their own proofs" on public.payment_proofs;
drop policy if exists "Admins can view all proofs" on public.payment_proofs;
drop policy if exists "Admins can update proofs" on public.payment_proofs;

-- 2. Re-enable RLS (just in case)
alter table public.payment_proofs enable row level security;

-- 3. Policy: Insert
-- Allow users to insert if the user_id matches their own auth UID
create policy "Users can upload their own proofs"
  on public.payment_proofs for insert
  with check (auth.uid() = user_id);

-- 4. Policy: Select
-- Allow users to view their own proofs
create policy "Users can view their own proofs"
  on public.payment_proofs for select
  using (
    -- Allow if the auth.uid matches the record's user_id
    auth.uid() = user_id
    -- OR if the user is an admin (in case admin panel uses same query)
    OR exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- 5. Policy: Admin View
-- Allow admins to view everything. 
-- Using a simpler check if possible, or keeping the subquery.
create policy "Admins can view all proofs"
  on public.payment_proofs for select
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.role = 'admin'
    )
  );

-- 6. Policy: Admin Update
create policy "Admins can update proofs"
  on public.payment_proofs for update
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.role = 'admin'
    )
  );
