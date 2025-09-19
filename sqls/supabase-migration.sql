-- Migration script to add is_verified field to existing profiles table
-- Run this if you already have a profiles table without the is_verified field

-- Add the is_verified column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' 
        AND column_name = 'is_verified'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.profiles 
        ADD COLUMN is_verified BOOLEAN DEFAULT FALSE NOT NULL;
    END IF;
END $$;

-- Update any existing demo accounts to be verified (if they exist)
UPDATE public.profiles 
SET is_verified = TRUE 
WHERE email IN (
    'test.admin@gmail.com',
    'test.director@gmail.com', 
    'test.judge@gmail.com',
    'test.participant@gmail.com',
    'test.evaluator@gmail.com'
);

-- Set admin accounts to verified by default (optional)
UPDATE public.profiles 
SET is_verified = TRUE 
WHERE role = 'admin';