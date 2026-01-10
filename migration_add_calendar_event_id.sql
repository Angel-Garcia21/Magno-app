-- Add calendar_event_id column to appointments table
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS calendar_event_id TEXT;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_appointments_calendar_event_id ON appointments(calendar_event_id);
