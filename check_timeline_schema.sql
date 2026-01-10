-- =====================================================
-- DIAGNOSTIC: Check actual timeline_events schema
-- =====================================================

-- 1. Check if timeline_events table exists and show its columns
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'timeline_events'
ORDER BY ordinal_position;

-- 2. Count existing timeline events
SELECT COUNT(*) as total_timeline_events
FROM public.timeline_events;

-- 3. Show sample timeline event (if any exist)
SELECT *
FROM public.timeline_events
LIMIT 1;

-- =====================================================
-- EXPECTED COLUMNS:
-- - id (uuid)
-- - property_id (uuid)
-- - title (text)
-- - description (text)
-- - event_date (date)  ← This is what the code expects
-- - status (varchar)
-- - created_at (timestamp)
-- =====================================================
