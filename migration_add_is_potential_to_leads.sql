-- Add is_potential column to leads_prospectos
ALTER TABLE leads_prospectos 
ADD COLUMN IF NOT EXISTS is_potential BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN leads_prospectos.is_potential IS 'Flag to mark high-potential leads manually';
