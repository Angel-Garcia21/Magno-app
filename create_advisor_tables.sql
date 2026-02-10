-- SQL Migration: Advisor Management System (Idempotent Version)

-- 1. Create Enums for Leads
DO $$ BEGIN
    CREATE TYPE lead_intent AS ENUM ('rent', 'buy', 'sell', 'rent_out');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE lead_status AS ENUM ('contacting', 'appointment', 'investigation_paid', 'investigation_passed', 'investigation_failed', 'closed_won', 'closed_lost');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Create leads_prospectos table
CREATE TABLE IF NOT EXISTS public.leads_prospectos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    property_id UUID REFERENCES public.properties(id) ON DELETE SET NULL,
    intent lead_intent DEFAULT 'rent',
    status lead_status DEFAULT 'contacting',
    assigned_to UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    payment_proof_url TEXT,
    payment_date DATE,
    investigation_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS for leads
ALTER TABLE public.leads_prospectos ENABLE ROW LEVEL SECURITY;

-- Clean up existing policies for leads before re-creating
DROP POLICY IF EXISTS "Admins can manage all leads" ON public.leads_prospectos;
DROP POLICY IF EXISTS "Advisors can manage their own leads" ON public.leads_prospectos;

-- Policies for leads
CREATE POLICY "Admins can manage all leads" ON public.leads_prospectos
    FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Advisors can manage their own leads" ON public.leads_prospectos
    FOR ALL TO authenticated
    USING (assigned_to = auth.uid())
    WITH CHECK (assigned_to = auth.uid());

-- 3. Create asesor_profiles table
CREATE TABLE IF NOT EXISTS public.asesor_profiles (
    user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    photo_url TEXT,
    is_verified BOOLEAN DEFAULT false,
    bio TEXT,
    sold_count INTEGER DEFAULT 0,
    rented_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS for advisor profiles
ALTER TABLE public.asesor_profiles ENABLE ROW LEVEL SECURITY;

-- Clean up existing policies for advisor profiles
DROP POLICY IF EXISTS "Public can view advisor profiles" ON public.asesor_profiles;
DROP POLICY IF EXISTS "Admins can manage all advisor profiles" ON public.asesor_profiles;
DROP POLICY IF EXISTS "Advisors can update their own profile" ON public.asesor_profiles;
DROP POLICY IF EXISTS "Advisors can insert their own profile" ON public.asesor_profiles;

-- Policies for advisor profiles
CREATE POLICY "Public can view advisor profiles" ON public.asesor_profiles
    FOR SELECT TO public USING (true);

CREATE POLICY "Admins can manage all advisor profiles" ON public.asesor_profiles
    FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Advisors can update their own profile" ON public.asesor_profiles
    FOR UPDATE TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "Advisors can insert their own profile" ON public.asesor_profiles
    FOR INSERT TO authenticated
    WITH CHECK (user_id = auth.uid());

-- 4. Update appointments table
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS feedback JSONB;

-- 5. Triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_leads_updated_at ON public.leads_prospectos;
CREATE TRIGGER update_leads_updated_at BEFORE UPDATE ON public.leads_prospectos FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

DROP TRIGGER IF EXISTS update_asesor_profiles_updated_at ON public.asesor_profiles;
CREATE TRIGGER update_asesor_profiles_updated_at BEFORE UPDATE ON public.asesor_profiles FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- 6. Storage Policies (Run only if bucket exists)
-- Ensure 'media' bucket exists
DO $$ 
BEGIN
    INSERT INTO storage.buckets (id, name, public) 
    VALUES ('media', 'media', true)
    ON CONFLICT (id) DO NOTHING;
END $$;

-- Clean up existing storage policies
DROP POLICY IF EXISTS "Advisors can upload profile photos" ON storage.objects;
DROP POLICY IF EXISTS "Admins have full access to media" ON storage.objects;
DROP POLICY IF EXISTS "Public can view media" ON storage.objects;

-- Storage Policies
CREATE POLICY "Advisors can upload profile photos" ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (bucket_id = 'media' AND (storage.foldername(name))[1] = 'advisors');

CREATE POLICY "Admins have full access to media" ON storage.objects
    FOR ALL TO authenticated
    USING (bucket_id = 'media' AND (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')))
    WITH CHECK (bucket_id = 'media' AND (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')));

CREATE POLICY "Public can view media" ON storage.objects
    FOR SELECT TO public
    USING (bucket_id = 'media');
