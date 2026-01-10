
-- Create Appraisals Table
CREATE TABLE IF NOT EXISTS appraisals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    first_name TEXT NOT NULL,
    last_name_1 TEXT NOT NULL,
    last_name_2 TEXT NOT NULL,
    property_type TEXT NOT NULL CHECK (property_type IN ('casa', 'departamento')),
    location TEXT NOT NULL,
    const_area NUMERIC NOT NULL,
    land_area NUMERIC NOT NULL,
    beds INTEGER NOT NULL,
    baths INTEGER NOT NULL,
    age INTEGER NOT NULL,
    furnishing TEXT NOT NULL CHECK (furnishing IN ('none', 'semi', 'full')),
    amenities TEXT[] DEFAULT '{}',
    services TEXT[] DEFAULT '{}',
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'completed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE appraisals ENABLE ROW LEVEL SECURITY;

-- Policy: Admin can do everything
CREATE POLICY "Admins can manage all appraisals"
ON appraisals
FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
);

-- Policy: Public can insert appraisals (for the guest flow)
CREATE POLICY "Public can insert appraisals"
ON appraisals
FOR INSERT
TO public
WITH CHECK (true);
