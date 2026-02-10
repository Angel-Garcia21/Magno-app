-- Add investigation review columns to leads_prospectos
ALTER TABLE leads_prospectos
ADD COLUMN IF NOT EXISTS investigation_status VARCHAR(50) DEFAULT 'days_pending', -- pending, review, approved, rejected
ADD COLUMN IF NOT EXISTS investigation_score VARCHAR(50),
ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;

-- Add investigation review columns to rental_applications
ALTER TABLE rental_applications
ADD COLUMN IF NOT EXISTS investigation_status VARCHAR(50) DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS investigation_score VARCHAR(50),
ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;

-- Add comments for clarity
COMMENT ON COLUMN leads_prospectos.investigation_status IS 'Status of the investigation process: pending, review, approved, rejected';
COMMENT ON COLUMN rental_applications.investigation_status IS 'Status of the investigation process: pending, review, approved, rejected';
