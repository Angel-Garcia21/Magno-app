-- Enable advisors/referrers to see the property submissions they referred
-- This is CRITICAL for the "Manual Link" feature to work with rental properties

DO $$
BEGIN
    -- Check if the policy for referred submissions exists
    IF NOT EXISTS (
        SELECT 1
        FROM pg_policies
        WHERE tablename = 'property_submissions'
        AND policyname = 'Advisors can see submissions they referred'
    ) THEN
        CREATE POLICY "Advisors can see submissions they referred"
        ON property_submissions
        FOR SELECT
        USING (auth.uid() = referred_by);
    END IF;
END
$$;

-- Ensure RLS is enabled on property_submissions
ALTER TABLE property_submissions ENABLE ROW LEVEL SECURITY;
