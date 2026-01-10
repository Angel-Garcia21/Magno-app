-- Migration for Rental Application Enhancements

-- Add new columns to rental_applications
ALTER TABLE rental_applications ADD COLUMN IF NOT EXISTS accepted_requirements BOOLEAN DEFAULT false;
ALTER TABLE rental_applications ADD COLUMN IF NOT EXISTS appointment_date DATE;
ALTER TABLE rental_applications ADD COLUMN IF NOT EXISTS appointment_time TEXT;

-- Create appointments table for general scheduling
CREATE TABLE IF NOT EXISTS appointments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    property_id UUID REFERENCES properties(id),
    title TEXT,
    description TEXT,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    client_name TEXT,
    client_phone TEXT,
    client_email TEXT,
    status TEXT DEFAULT 'scheduled',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS for appointments
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable select for authenticated users" ON appointments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Enable insert for authenticated users" ON appointments FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Enable update for authenticated users" ON appointments FOR UPDATE TO authenticated USING (true);
