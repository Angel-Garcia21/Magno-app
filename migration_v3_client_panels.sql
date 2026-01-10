
-- Migration: Add Client Panel Fields to Profiles
-- This adds the necessary columns to support specialized dashboards for Owners and Tenants.

DO $$ 
BEGIN
    -- Add columns to public.profiles if they don't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='property_code') THEN
        ALTER TABLE public.profiles ADD COLUMN property_code text;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='deposit_day') THEN
        ALTER TABLE public.profiles ADD COLUMN deposit_day text;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='monthly_amount') THEN
        ALTER TABLE public.profiles ADD COLUMN monthly_amount numeric;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='contract_end_date') THEN
        ALTER TABLE public.profiles ADD COLUMN contract_end_date text;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='contract_start_date') THEN
        ALTER TABLE public.profiles ADD COLUMN contract_start_date text;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='linked_name') THEN
        ALTER TABLE public.profiles ADD COLUMN linked_name text;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='phone_contact') THEN
        ALTER TABLE public.profiles ADD COLUMN phone_contact text;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='vouchers') THEN
        ALTER TABLE public.profiles ADD COLUMN vouchers text[];
    END IF;
END $$;
