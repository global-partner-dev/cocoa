-- Manual Email Confirmation Script
-- Run this in your Supabase SQL Editor to manually confirm user emails
-- This is a workaround if you can't disable email confirmations in the dashboard

-- Replace 'user@example.com' with the actual email address
UPDATE auth.users 
SET email_confirmed_at = NOW()
WHERE email = 'user@example.com' 
AND email_confirmed_at IS NULL;

-- To confirm all unconfirmed users (use with caution):
-- UPDATE auth.users 
-- SET email_confirmed_at = NOW()
-- WHERE email_confirmed_at IS NULL;

-- To check which users need confirmation:
SELECT email, email_confirmed_at, created_at 
FROM auth.users 
WHERE email_confirmed_at IS NULL;