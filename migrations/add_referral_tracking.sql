-- Migration: Add Referral Tracking to Applications and Leads
-- This enables commission attribution for advisors

-- Add referred_by column to rental_applications
ALTER TABLE rental_applications 
ADD COLUMN IF NOT EXISTS referred_by UUID REFERENCES profiles(id);

-- Add referred_by column to leads_prospectos
ALTER TABLE leads_prospectos 
ADD COLUMN IF NOT EXISTS referred_by UUID REFERENCES profiles(id);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_rental_applications_referred_by 
ON rental_applications(referred_by);

CREATE INDEX IF NOT EXISTS idx_leads_prospectos_referred_by 
ON leads_prospectos(referred_by);

-- Add comment for documentation
COMMENT ON COLUMN rental_applications.referred_by IS 'Advisor who referred this application (for commission tracking)';
COMMENT ON COLUMN leads_prospectos.referred_by IS 'Advisor who referred this lead (for commission tracking)';
