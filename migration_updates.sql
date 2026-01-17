-- 1. Create Media Storage Bucket for Blog Images
insert into storage.buckets (id, name, public)
values ('media', 'media', true)
on conflict (id) do nothing;

-- 2. Storage RLS Policies for 'media' bucket
-- Allow public read access
create policy "Public Access"
on storage.objects for select
using ( bucket_id = 'media' );

-- Allow admins to upload/update/delete
create policy "Admin Management"
on storage.objects for all
using (
  auth.role() = 'authenticated' and
  exists (
    select 1 from public.profiles
    where profiles.id = auth.uid() and role = 'admin'
  )
)
with check (
  auth.role() = 'authenticated' and
  exists (
    select 1 from public.profiles
    where profiles.id = auth.uid() and role = 'admin'
  )
);

-- 3. Update payment_proofs table to include payment_type
alter table public.payment_proofs 
add column if not exists payment_type text;

comment on column public.payment_proofs.payment_type is 'Tipo de pago: Retiro sin tarjeta, Transferencia, etc.';
