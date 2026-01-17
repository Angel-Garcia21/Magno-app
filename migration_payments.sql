-- Add payment_type column to payment_proofs table
alter table public.payment_proofs 
add column if not exists payment_type text;

comment on column public.payment_proofs.payment_type is 'Tipo de pago: Retiro sin tarjeta, Transferencia, etc.';
