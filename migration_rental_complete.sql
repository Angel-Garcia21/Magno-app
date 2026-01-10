-- ========================================
-- Complete Migration: Rental Applications
-- ========================================

-- Step 1: Create rental_applications table
CREATE TABLE IF NOT EXISTS rental_applications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    property_id UUID REFERENCES properties(id),
    property_ref TEXT,
    full_name TEXT,
    phone TEXT,
    email TEXT,
    adults INTEGER,
    children INTEGER,
    has_pets BOOLEAN,
    knows_area BOOLEAN,
    reason TEXT,
    move_date DATE,
    duration TEXT,
    income_source TEXT,
    meets_ratio BOOLEAN,
    bureau_status TEXT,
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Step 2: Add new fields for enhanced functionality
ALTER TABLE rental_applications ADD COLUMN IF NOT EXISTS urgency TEXT;
ALTER TABLE rental_applications ADD COLUMN IF NOT EXISTS accepted_requirements BOOLEAN DEFAULT false;
ALTER TABLE rental_applications ADD COLUMN IF NOT EXISTS appointment_date DATE;
ALTER TABLE rental_applications ADD COLUMN IF NOT EXISTS appointment_time TEXT;

-- Step 3: Add RLS policies
ALTER TABLE rental_applications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable insert for everyone" ON rental_applications;
DROP POLICY IF EXISTS "Enable select for authenticated users" ON rental_applications;

CREATE POLICY "Enable insert for everyone" ON rental_applications FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable select for authenticated users" ON rental_applications FOR SELECT TO authenticated USING (true);

-- Step 4: Ensure is_featured column exists on properties
ALTER TABLE properties ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT false;
