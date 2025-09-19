-- Test script to verify payments table structure and constraints
-- This will help us debug why payments aren't being stored

-- Check if the payments table exists and its structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'payments' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check the role constraint
SELECT constraint_name, check_clause 
FROM information_schema.check_constraints 
WHERE constraint_name = 'payments_role_check';

-- Check RLS policies
SELECT policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE tablename = 'payments' 
AND schemaname = 'public';

-- Test inserting a director payment (this should work if everything is set up correctly)
-- Note: This is just a test - we'll rollback after

-- First, let's check if there are any existing users we can use for testing
SELECT id, role, name FROM public.profiles WHERE role = 'director' LIMIT 1;

-- If there are no directors, let's check for any users
SELECT id, role, name FROM public.profiles LIMIT 3;

-- Test the constraint by trying to insert with a non-existent user (should fail)
BEGIN;
INSERT INTO public.payments (
  user_id, 
  role, 
  amount_cents, 
  currency, 
  status, 
  source, 
  sample_id
) VALUES (
  '00000000-0000-0000-0000-000000000000', -- dummy UUID that doesn't exist
  'director',
  5000,
  'USD',
  'paid',
  'test',
  '00000000-0000-0000-0000-000000000001' -- dummy sample UUID
);
ROLLBACK;

-- This should show us the foreign key constraint is working
SELECT 'Foreign key constraint test: EXPECTED TO FAIL' as result;
