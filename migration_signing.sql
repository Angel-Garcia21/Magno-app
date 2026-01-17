-- Migration for Digital Document Signing System

-- 1. Create table for Signed Documents
create table if not exists public.signed_documents (
  id uuid default gen_random_uuid() primary key,
  property_id uuid references public.properties(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  document_type text not null check (document_type in ('recruitment', 'keys', 'contract')),
  status text default 'pending' check (status in ('pending', 'signed')),
  signature_url text, -- URL to the signature image in storage
  pdf_url text, -- URL to the final signed PDF in storage
  signed_at timestamptz,
  created_at timestamptz default now()
);

-- 2. Enable RLS
alter table public.signed_documents enable row level security;

-- 3. RLS Policies
create policy "Users can view their own signed documents"
  on public.signed_documents for select
  using (auth.uid() = user_id);

create policy "Users can insert signed documents"
  on public.signed_documents for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own signed documents"
  on public.signed_documents for update
  using (auth.uid() = user_id);

-- 4. Add keys_provided column to properties table
alter table public.properties 
add column if not exists keys_provided boolean default false;

-- 5. Add storage bucket policies (if not already existing for generic docs, but specific for signatures)
-- Assuming 'media' bucket exists
-- You might need to add a policy for the 'signatures' folder if you want strict separation, 
-- but 'media' bucket usually handles authenticated uploads.
