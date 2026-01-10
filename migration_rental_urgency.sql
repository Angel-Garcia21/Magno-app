-- Add urgency column to rental_applications table
ALTER TABLE rental_applications ADD COLUMN IF NOT EXISTS urgency TEXT;

-- Add accepted_requirements and appointment fields if they don't exist
ALTER TABLE rental_applications ADD COLUMN IF NOT EXISTS accepted_requirements BOOLEAN DEFAULT false;
ALTER TABLE rental_applications ADD COLUMN IF NOT EXISTS appointment_date DATE;
ALTER TABLE rental_applications ADD COLUMN IF NOT EXISTS appointment_time TEXT;
