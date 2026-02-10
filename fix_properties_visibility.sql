-- Enable advisors/referrers to see the properties they referred, even if they don't own them
-- This is critical for the "Manual Link" feature to work.

DO $$
BEGIN
    -- Check if the policy specifically for referred properties exists
    IF NOT EXISTS (
        SELECT 1
        FROM pg_policies
        WHERE tablename = 'properties'
        AND policyname = 'Advisors can see properties they referred'
    ) THEN
        CREATE POLICY "Advisors can see properties they referred"
        ON properties
        FOR SELECT
        USING (auth.uid() = referred_by);
    END IF;
END
$$;

-- Also verify if we need to enable RLS on the table (usually it is enabled)
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
