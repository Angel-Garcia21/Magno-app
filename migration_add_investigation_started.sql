-- Add investigation_started_at column to leads_prospectos table
-- This column tracks when the investigation process was initiated for a lead

ALTER TABLE leads_prospectos 
ADD COLUMN IF NOT EXISTS investigation_started_at TIMESTAMPTZ;

COMMENT ON COLUMN leads_prospectos.investigation_started_at IS 'Timestamp when investigation was started for this lead';
