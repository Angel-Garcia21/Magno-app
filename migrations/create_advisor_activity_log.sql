-- =====================================================
-- ADVISOR ACTIVITY LOG - STREAK PERSISTENCE FIX
-- =====================================================
-- This table records events like lead registrations
-- to ensure streaks (rachas) persist even if leads are deleted.
-- =====================================================

CREATE TABLE IF NOT EXISTS public.advisor_activity_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    advisor_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    activity_type TEXT NOT NULL, -- e.g., 'lead_registration'
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Enable RLS
ALTER TABLE public.advisor_activity_log ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Advisors can view their own activity"
ON public.advisor_activity_log FOR SELECT
USING (auth.uid() = advisor_id);

CREATE POLICY "Advisors can insert their own activity"
ON public.advisor_activity_log FOR INSERT
WITH CHECK (auth.uid() = advisor_id);

CREATE POLICY "Admins can view all activity"
ON public.advisor_activity_log FOR SELECT
USING (
    exists (
        select 1 from public.profiles
        where profiles.id = auth.uid() and role = 'admin'
    )
);

-- Index for streak calculation performance
CREATE INDEX IF NOT EXISTS idx_advisor_activity_log_advisor_date 
ON public.advisor_activity_log (advisor_id, created_at);
