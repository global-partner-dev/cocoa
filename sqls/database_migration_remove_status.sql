-- Migration: Remove status column from evaluator_documents table
-- Run this in your Supabase SQL Editor

-- Step 1: Remove the status column from evaluator_documents table
ALTER TABLE evaluator_documents DROP COLUMN IF EXISTS status;

-- Step 2: (Optional) If you had any indexes on the status column, they will be automatically dropped
-- Step 3: (Optional) If you had any constraints on the status column, they will be automatically dropped

-- Verify the change by checking the table structure
-- You can run this to confirm the column is removed:
-- SELECT column_name, data_type, is_nullable 
-- FROM information_schema.columns 
-- WHERE table_name = 'evaluator_documents' 
-- ORDER BY ordinal_position;