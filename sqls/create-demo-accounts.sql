-- Create Demo Accounts Script
-- Run this in your Supabase SQL Editor to create demo accounts

-- First, create the auth users (this requires service role key)
-- You'll need to run this with your service role key, not the anon key

-- For now, let's create profiles for demo accounts that can be used once auth users are created
INSERT INTO public.profiles (id, email, name, phone, role, is_verified) VALUES
-- Generate UUIDs for demo accounts
('11111111-1111-1111-1111-111111111111', 'test.admin@gmail.com', 'Demo Admin', '+1234567890', 'admin', true),
('22222222-2222-2222-2222-222222222222', 'test.director@gmail.com', 'Demo Director', '+1234567891', 'director', true),
('33333333-3333-3333-3333-333333333333', 'test.judge@gmail.com', 'Demo Judge', '+1234567892', 'judge', true),
('44444444-4444-4444-4444-444444444444', 'test.participant@gmail.com', 'Demo Participant', '+1234567893', 'participant', true),
('55555555-5555-5555-5555-555555555555', 'test.evaluator@gmail.com', 'Demo Evaluator', '+1234567894', 'evaluator', true)
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  name = EXCLUDED.name,
  phone = EXCLUDED.phone,
  role = EXCLUDED.role,
  is_verified = EXCLUDED.is_verified;

-- Check if profiles were created
SELECT * FROM public.profiles WHERE email LIKE 'test.%@gmail.com';

-- To create the actual auth users, you need to use the Supabase Admin API or dashboard
-- Or run this with service role key:

/*
-- This part requires service role key - run separately if needed
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  recovery_sent_at,
  last_sign_in_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  '11111111-1111-1111-1111-111111111111',
  'authenticated',
  'authenticated',
  'test.admin@gmail.com',
  crypt('zxcasdQWE123!@#', gen_salt('bf')),
  NOW(),
  NULL,
  NULL,
  '{"provider":"email","providers":["email"]}',
  '{}',
  NOW(),
  NOW(),
  '',
  '',
  '',
  ''
);
*/