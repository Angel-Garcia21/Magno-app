-- Critical Diagnostic: Does the lead's property_id match the submission's id?

-- 1. Show the lead's property_id
SELECT 
    'Lead Data' as check_type,
    id as lead_id,
    property_id,
    status,
    intent
FROM leads_prospectos
WHERE id = '1f620f71-865a-48fa-bc6c-63907b834e53';

-- 2. Show the submission's id
SELECT 
    'Submission Data' as check_type,
    id as submission_id,
    type,
    referred_by,
    status
FROM property_submissions
WHERE referred_by = 'c26550a5-a31f-4fc7-8c47-fe20ae476647'
ORDER BY created_at DESC
LIMIT 1;

-- 3. Check if they match
SELECT 
    CASE 
        WHEN l.property_id = s.id THEN '✅ MATCH - IDs are identical'
        WHEN l.property_id IS NULL THEN '⚠️ Lead has NO property_id'
        ELSE '❌ MISMATCH - Different IDs'
    END as match_status,
    l.property_id as lead_property_id,
    s.id as submission_id
FROM leads_prospectos l
CROSS JOIN (
    SELECT id FROM property_submissions 
    WHERE referred_by = 'c26550a5-a31f-4fc7-8c47-fe20ae476647'
    ORDER BY created_at DESC 
    LIMIT 1
) s
WHERE l.id = '1f620f71-865a-48fa-bc6c-63907b834e53';
