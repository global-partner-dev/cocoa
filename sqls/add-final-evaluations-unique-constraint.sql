-- Add unique constraint to final_evaluations table
-- This allows upsert operations to work properly when an evaluator re-evaluates a sample
-- Run in Supabase SQL editor

-- Add unique constraint on (sample_id, evaluator_id)
-- This ensures one evaluator can only have one evaluation per sample
ALTER TABLE public.final_evaluations 
ADD CONSTRAINT final_evaluations_sample_evaluator_unique 
UNIQUE (sample_id, evaluator_id);