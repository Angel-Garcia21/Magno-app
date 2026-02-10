-- Migration to add performance tracking for advisors
ALTER TABLE asesor_profiles 
ADD COLUMN IF NOT EXISTS weekly_goal bigint DEFAULT 50000;

-- Optional: Track total earnings if not already present
ALTER TABLE asesor_profiles 
ADD COLUMN IF NOT EXISTS total_earnings numeric DEFAULT 0;

COMMENT ON COLUMN asesor_profiles.weekly_goal IS 'Weekly sales/rental target in currency units';
