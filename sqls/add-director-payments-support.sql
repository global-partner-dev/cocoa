-- Add support for director payments in the payments table
-- This migration adds the necessary fields and constraints for director payments

-- Add director role to the payments table constraint
ALTER TABLE public.payments 
DROP CONSTRAINT IF EXISTS payments_role_check;

-- Add new constraint that allows evaluator and director roles
ALTER TABLE public.payments 
ADD CONSTRAINT payments_role_check 
CHECK (role IN ('evaluator', 'director'));

-- Add sample_ids array field for director bulk payments
ALTER TABLE public.payments 
ADD COLUMN IF NOT EXISTS sample_ids UUID[] NULL;

-- Add constraint to ensure either sample_id OR sample_ids is set, but not both
ALTER TABLE public.payments 
ADD CONSTRAINT payments_sample_constraint 
CHECK (
  (sample_id IS NOT NULL AND sample_ids IS NULL) OR 
  (sample_id IS NULL AND sample_ids IS NOT NULL)
);

-- Update RLS policies to include director role
DROP POLICY IF EXISTS "Evaluators can view their own payments" ON public.payments;
CREATE POLICY "Users can view their own payments" ON public.payments
    FOR SELECT USING (
        auth.uid() = user_id AND role IN ('evaluator', 'director')
    );

DROP POLICY IF EXISTS "Evaluators can insert their own payments" ON public.payments;
CREATE POLICY "Users can insert their own payments" ON public.payments
    FOR INSERT WITH CHECK (
        auth.uid() = user_id AND role IN ('evaluator', 'director')
    );

-- Add index for sample_ids array field
CREATE INDEX IF NOT EXISTS idx_payments_sample_ids ON public.payments USING GIN (sample_ids);

-- Verify the changes
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'payments' 
AND table_schema = 'public' 
ORDER BY ordinal_position;
