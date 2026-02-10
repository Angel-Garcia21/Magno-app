-- 1. Ensure columns exist (Idempotent)
ALTER TABLE appointments 
ADD COLUMN IF NOT EXISTS feedback JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS is_potential BOOLEAN DEFAULT FALSE;

ALTER TABLE rental_applications 
ADD COLUMN IF NOT EXISTS feedback JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS is_potential BOOLEAN DEFAULT FALSE;

-- 2. Enable RLS (Safety check)
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE rental_applications ENABLE ROW LEVEL SECURITY;

-- 3. Create or Replace Policies for Advisors to Update
-- We use DO block to avoid error if policy doesn't exist when trying to drop
DO $$
BEGIN
    -- Drop old policies if names conflict
    BEGIN DROP POLICY "Advisors can update assigned appointments" ON appointments; EXCEPTION WHEN OTHERS THEN NULL; END;
    BEGIN DROP POLICY "Advisors can update assigned rental_apps" ON rental_applications; EXCEPTION WHEN OTHERS THEN NULL; END;
END
$$;

-- Policy: Advisors can UPDATE appointments assigned to them
CREATE POLICY "Advisors can update assigned appointments" 
ON appointments 
FOR UPDATE 
TO authenticated
USING (auth.uid() = assigned_to)
WITH CHECK (auth.uid() = assigned_to);

-- Policy: Advisors can UPDATE rental_applications assigned to them
CREATE POLICY "Advisors can update assigned rental_apps" 
ON rental_applications 
FOR UPDATE 
TO authenticated
USING (auth.uid() = assigned_to)
WITH CHECK (auth.uid() = assigned_to);

-- 4. Notify to refresh schema cache
NOTIFY pgrst, 'reload schema';
