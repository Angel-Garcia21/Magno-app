-- =====================================================
-- ADVISOR COUNTER PERSISTENCE & CONTROL FIX
-- =====================================================

-- 1. Ensure columns exist on profiles table
-- =====================================================
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS sold_count INTEGER DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS rented_count INTEGER DEFAULT 0;

-- 2. Sync data from asesor_profiles to profiles (if any exists)
-- =====================================================
UPDATE public.profiles p
SET 
  sold_count = ap.sold_count,
  rented_count = ap.rented_count
FROM public.asesor_profiles ap
WHERE p.id = ap.user_id;

-- 3. Create/Update Comprehensive Counter RPCs
-- =====================================================

-- Increment Sold
CREATE OR REPLACE FUNCTION increment_sold_count(advisor_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE profiles SET sold_count = COALESCE(sold_count, 0) + 1 WHERE id = advisor_id;
END;
$$ LANGUAGE plpgsql;

-- Increment Rented
CREATE OR REPLACE FUNCTION increment_rented_count(advisor_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE profiles SET rented_count = COALESCE(rented_count, 0) + 1 WHERE id = advisor_id;
END;
$$ LANGUAGE plpgsql;

-- Decrement Sold
CREATE OR REPLACE FUNCTION decrement_sold_count(advisor_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE profiles SET sold_count = GREATEST(COALESCE(sold_count, 0) - 1, 0) WHERE id = advisor_id;
END;
$$ LANGUAGE plpgsql;

-- Decrement Rented
CREATE OR REPLACE FUNCTION decrement_rented_count(advisor_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE profiles SET rented_count = GREATEST(COALESCE(rented_count, 0) - 1, 0) WHERE id = advisor_id;
END;
$$ LANGUAGE plpgsql;

-- Set Sold
CREATE OR REPLACE FUNCTION set_sold_count(advisor_id UUID, new_count INTEGER)
RETURNS void AS $$
BEGIN
  UPDATE profiles SET sold_count = new_count WHERE id = advisor_id;
END;
$$ LANGUAGE plpgsql;

-- Set Rented
CREATE OR REPLACE FUNCTION set_rented_count(advisor_id UUID, new_count INTEGER)
RETURNS void AS $$
BEGIN
  UPDATE profiles SET rented_count = new_count WHERE id = advisor_id;
END;
$$ LANGUAGE plpgsql;
