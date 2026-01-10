-- Create rental_applications table
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

-- Add RLS policies (simple for now: anyone can insert, only admin can view)
ALTER TABLE rental_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable insert for everyone" ON rental_applications FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable select for authenticated users" ON rental_applications FOR SELECT TO authenticated USING (true);

-- Ensure is_featured column exists on properties
ALTER TABLE properties ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT false;
