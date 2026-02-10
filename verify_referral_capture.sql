-- Verify Latest Property Submission Referral
-- Run this AFTER completing the test submission to check if referred_by was saved

SELECT 
    id,
    type,
    status,
    owner_id,
    referred_by,
    created_at,
    form_data->>'title' as property_title,
    form_data->>'address' as property_address
FROM property_submissions
ORDER BY created_at DESC
LIMIT 1;

-- Expected Result:
-- referred_by should be: c26550a5-a31f-4fc7-8c47-fe20ae476647
