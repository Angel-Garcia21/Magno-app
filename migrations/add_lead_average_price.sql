-- Add average_price column to leads_prospectos table
ALTER TABLE public.leads_prospectos 
ADD COLUMN IF NOT EXISTS average_price NUMERIC;
