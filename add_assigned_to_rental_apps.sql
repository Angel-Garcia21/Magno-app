-- Migration: Add Advisor Assignment to Rental Applications
ALTER TABLE rental_applications ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE rental_applications ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_rental_apps_assigned_to ON rental_applications(assigned_to);

-- Trigger for updated_at if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_rental_apps_updated_at') THEN
        CREATE TRIGGER update_rental_apps_updated_at 
        BEFORE UPDATE ON rental_applications 
        FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
    END IF;
END $$;
