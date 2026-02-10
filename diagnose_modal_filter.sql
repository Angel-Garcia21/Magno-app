-- Diagnostic: Why isn't the property appearing in the Link Modal?

-- 1. Property data
SELECT 
    'Property Submission Data' as check_type,
    id,
    type,
    status,
    referred_by,
    owner_id
FROM property_submissions
WHERE referred_by = 'c26550a5-a31f-4fc7-8c47-fe20ae476647'
ORDER BY created_at DESC
LIMIT 1;

-- 2. Check if there's already a lead linked to this property
SELECT 
    'Lead Linked to Property?' as check_type,
    id as lead_id,
    property_id,
    status as lead_status
FROM leads_prospectos
WHERE property_id IN (
    SELECT id FROM property_submissions 
    WHERE referred_by = 'c26550a5-a31f-4fc7-8c47-fe20ae476647'
    ORDER BY created_at DESC 
    LIMIT 1
);


-- Expected Result Analysis:
-- If "Lead Linked to Property?" returns rows, the property is EXCLUDED by the filter
-- If it returns NO rows, the filter should INCLUDE it

