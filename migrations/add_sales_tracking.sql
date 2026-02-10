-- =====================================================
-- SALES TRACKING SYSTEM - PERSISTENT ARCHIVING
-- =====================================================
-- Run this in your Supabase SQL Editor to enable
-- point-in-time property data archiving.
-- =====================================================

-- 1. Add assigned_advisor and property_snapshot columns
-- =====================================================

ALTER TABLE rental_applications 
ADD COLUMN IF NOT EXISTS assigned_advisor UUID REFERENCES profiles(id),
ADD COLUMN IF NOT EXISTS property_snapshot JSONB;

ALTER TABLE property_submissions 
ADD COLUMN IF NOT EXISTS assigned_advisor UUID REFERENCES profiles(id),
ADD COLUMN IF NOT EXISTS property_snapshot JSONB;

ALTER TABLE leads_prospectos
ADD COLUMN IF NOT EXISTS property_snapshot JSONB;


-- 2. Create advisor_transactions table with snapshot support
-- =====================================================

CREATE TABLE IF NOT EXISTS advisor_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  advisor_id UUID REFERENCES profiles(id) NOT NULL,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('sale', 'rental', 'manual_adjustment')),
  property_id UUID,
  application_id UUID,
  adjustment_amount INTEGER DEFAULT 1,
  confirmed_by UUID REFERENCES profiles(id),
  confirmed_at TIMESTAMPTZ DEFAULT NOW(),
  property_snapshot JSONB,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_advisor_transactions_advisor_id ON advisor_transactions(advisor_id);
CREATE INDEX IF NOT EXISTS idx_advisor_transactions_type ON advisor_transactions(transaction_type);


-- 3. Create/Update increment functions
-- =====================================================

CREATE OR REPLACE FUNCTION increment_sold_count(advisor_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE profiles SET sold_count = COALESCE(sold_count, 0) + 1 WHERE id = advisor_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION increment_rented_count(advisor_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE profiles SET rented_count = COALESCE(rented_count, 0) + 1 WHERE id = advisor_id;
END;
$$ LANGUAGE plpgsql;


-- 4. Unified function for pending confirmations (Snapshot Enabled)
-- =====================================================

CREATE OR REPLACE FUNCTION get_pending_confirmations()
RETURNS TABLE (
  id UUID,
  type TEXT,
  client_name TEXT,
  property_ref TEXT,
  advisor_id UUID,
  advisor_name TEXT,
  created_at TIMESTAMPTZ,
  precaptured_snapshot JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ra.id,
    'rental'::TEXT as type,
    ra.full_name as client_name,
    ra.property_ref,
    COALESCE(ra.assigned_advisor, ra.referred_by) as advisor_id,
    p.full_name as advisor_name,
    ra.created_at,
    ra.property_snapshot
  FROM rental_applications ra
  LEFT JOIN profiles p ON p.id = COALESCE(ra.assigned_advisor, ra.referred_by)
  WHERE ra.status = 'ready_to_close'
  
  UNION ALL
  
  SELECT 
    ps.id,
    'sale'::TEXT as type,
    (ps.form_data->>'contact_name')::TEXT as client_name,
    ps.property_ref,
    COALESCE(ps.assigned_advisor, ps.referred_by) as advisor_id,
    p.full_name as advisor_name,
    ps.created_at,
    ps.property_snapshot
  FROM property_submissions ps
  LEFT JOIN profiles p ON p.id = COALESCE(ps.assigned_advisor, ps.referred_by)
  WHERE ps.status = 'ready_to_close'
  
  ORDER BY created_at DESC;
END;
$$ LANGUAGE plpgsql;
