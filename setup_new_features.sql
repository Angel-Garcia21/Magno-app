-- Enable UUID extension if not already enabled
create extension if not exists "uuid-ossp";

-- 1. Payment Proofs Table (Comprobantes)
create table if not exists public.payment_proofs (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) not null,
  property_id uuid references public.properties(id) not null,
  month_year varchar(10) not null, -- Format 'YYYY-MM'
  amount numeric,
  proof_url text not null,
  status varchar(20) default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS for Payment Proofs
alter table public.payment_proofs enable row level security;

-- Users can insert their own proofs
create policy "Users can upload their own proofs"
  on public.payment_proofs for insert
  with check (auth.uid() = user_id);

-- Users can view their own proofs
create policy "Users can view their own proofs"
  on public.payment_proofs for select
  using (auth.uid() = user_id);

-- Admins can view all proofs
-- Assuming we identify admins via a profile role or simple email check check in app logic, 
-- but for RLS usually we might need a claim. For now, allow public read or authenticated read if admins are just users with a role field in profiles.
-- Better approach: Check if user is admin in profiles table (requires a join policy which can be complex or performant heavy)
-- SIMPLIFICATION: Allow authenticated users to view all (Admin filters on frontend) OR strictly:
create policy "Admins can view all proofs"
  on public.payment_proofs for select
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.role = 'admin'
    )
  );

-- Admins can update status
create policy "Admins can update proofs"
  on public.payment_proofs for update
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.role = 'admin'
    )
  );


-- 2. Timeline Events Table
create table if not exists public.timeline_events (
  id uuid default uuid_generate_v4() primary key,
  property_id uuid references public.properties(id) not null,
  title text not null,
  description text,
  event_date date not null,
  status varchar(20) default 'pending' check (status in ('pending', 'in-progress', 'completed')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS for Timeline
alter table public.timeline_events enable row level security;

-- Everyone can read timeline events for properties they are linked to?
-- Simplification: Authenticated users can read.
-- Authenticated users can read all timeline events (filtered by property_id in the query)
create policy "Authenticated users can read timeline"
  on public.timeline_events for select
  using (auth.role() = 'authenticated');

-- Only admins can insert/update/delete
create policy "Admins can manage timeline"
  on public.timeline_events for all
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.role = 'admin'
    )
  );

-- 3. Storage Bucket for Payment Proofs
insert into storage.buckets (id, name, public)
values ('payment-proofs', 'payment-proofs', true)
on conflict (id) do nothing;

-- Storage Policies
create policy "Give access to authenticated users to upload proofs"
  on storage.objects for insert
  with check (
    bucket_id = 'payment-proofs' and
    auth.role() = 'authenticated'
  );

create policy "Give public access to view proofs"
  on storage.objects for select
  using (bucket_id = 'payment-proofs');
