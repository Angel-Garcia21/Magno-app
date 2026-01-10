-- SQL to manually confirm all existing users
-- Run this in the Supabase SQL Editor

UPDATE auth.users 
SET email_confirmed_at = NOW(),
    updated_at = NOW()
WHERE email_confirmed_at IS NULL;

-- Also ensure future users don't face this (optional based on setting)
-- But it's better to change the setting in Dashboard -> Settings -> Auth -> Confirm Email (Toggle Off)
