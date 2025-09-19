-- Update payments table to allow director role
-- This is a minimal migration to support director payments

-- Update the role constraint to include director
ALTER TABLE public.payments 
DROP CONSTRAINT IF EXISTS payments_role_check;

-- Add new constraint that allows evaluator and director roles
ALTER TABLE public.payments 
ADD CONSTRAINT payments_role_check 
CHECK (role IN ('evaluator', 'director'));

-- Update RLS policies to include director role
DROP POLICY IF EXISTS "Evaluators can view their own payments" ON public.payments;
DROP POLICY IF EXISTS "Users can view their own payments" ON public.payments;
CREATE POLICY "Users can view their own payments" ON public.payments
    FOR SELECT USING (
        auth.uid() = user_id AND role IN ('evaluator', 'director')
    );

DROP POLICY IF EXISTS "Evaluators can insert their own payments" ON public.payments;
DROP POLICY IF EXISTS "Users can insert their own payments" ON public.payments;
CREATE POLICY "Users can insert their own payments" ON public.payments
    FOR INSERT WITH CHECK (
        auth.uid() = user_id AND role IN ('evaluator', 'director')
    );

-- Verify the changes
SELECT constraint_name, check_clause 
FROM information_schema.check_constraints 
WHERE constraint_name = 'payments_role_check';
