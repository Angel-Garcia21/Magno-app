-- ========================================
-- Migration: Enhanced Sale Applications
-- ========================================

-- Add columns to support Sale Applications in the existing rental_applications table
ALTER TABLE rental_applications ADD COLUMN IF NOT EXISTS application_type TEXT DEFAULT 'rent'; -- 'rent' or 'sale'
ALTER TABLE rental_applications ADD COLUMN IF NOT EXISTS is_bureau_severe BOOLEAN;
ALTER TABLE rental_applications ADD COLUMN IF NOT EXISTS mortgage_status TEXT;
ALTER TABLE rental_applications ADD COLUMN IF NOT EXISTS payment_method TEXT;

-- Update RLS if needed (already permissive for insert)
