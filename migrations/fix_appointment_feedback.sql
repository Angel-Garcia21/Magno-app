-- Add feedback and potential tracking columns to appointments
ALTER TABLE appointments 
ADD COLUMN IF NOT EXISTS feedback JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS is_potential BOOLEAN DEFAULT FALSE;

-- Add feedback and potential tracking columns to rental_applications
ALTER TABLE rental_applications 
ADD COLUMN IF NOT EXISTS feedback JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS is_potential BOOLEAN DEFAULT FALSE;

-- Notify change for realtime update
NOTIFY pgrst, 'reload schema';
