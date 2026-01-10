-- Internal Properties Table (Administrative only)
CREATE TABLE IF NOT EXISTS public.internal_properties (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  ref text NOT NULL UNIQUE, -- The "Folio"
  title text NOT NULL,
  address text NOT NULL,
  
  -- Simplified Owner/Tenant linkage
  owner_id uuid REFERENCES public.profiles(id),
  tenant_id uuid REFERENCES public.profiles(id),
  
  -- Basic fields only
  status text DEFAULT 'rented',
  created_at timestamptz DEFAULT now()
);

-- RLS
ALTER TABLE public.internal_properties ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT FROM pg_policies WHERE tablename = 'internal_properties' AND policyname = 'Admins view all internal') THEN
    CREATE POLICY "Admins view all internal" ON public.internal_properties FOR SELECT USING (true);
  END IF;
  
  IF NOT EXISTS (SELECT FROM pg_policies WHERE tablename = 'internal_properties' AND policyname = 'Admins insert internal') THEN
    CREATE POLICY "Admins insert internal" ON public.internal_properties FOR INSERT WITH CHECK (true);
  END IF;
  
  IF NOT EXISTS (SELECT FROM pg_policies WHERE tablename = 'internal_properties' AND policyname = 'Admins update internal') THEN
    CREATE POLICY "Admins update internal" ON public.internal_properties FOR UPDATE USING (true);
  END IF;
END $$;
