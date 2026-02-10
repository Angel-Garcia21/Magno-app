
-- Inspect the last 5 properties to check if 'referred_by' is being populated correctly.
SELECT id, title, status, referred_by, owner_id, created_at
FROM properties
ORDER BY created_at DESC
LIMIT 5;
