-- Update payment table to remove participant payments
-- Since participants no longer pay for sample submissions, we can clean up the payment table

-- Remove participant payments (keep evaluator payments for final evaluation phase)
DELETE FROM public.payments 
WHERE role = 'participant';

-- Update the payment table to remove participant role from constraint
ALTER TABLE public.payments 
DROP CONSTRAINT IF EXISTS payments_role_check;

-- Add new constraint that only allows evaluator role
ALTER TABLE public.payments 
ADD CONSTRAINT payments_role_check 
CHECK (role IN ('evaluator'));

-- Remove any payment-related policies for participants
DROP POLICY IF EXISTS "Participants can view their own payments" ON public.payments;
DROP POLICY IF EXISTS "Participants can insert their own payments" ON public.payments;

-- Update RLS policies to only allow evaluator payments
DROP POLICY IF EXISTS "Users can view their own payments" ON public.payments;
CREATE POLICY "Evaluators can view their own payments" ON public.payments
    FOR SELECT USING (
        auth.uid() = user_id AND role = 'evaluator'
    );

DROP POLICY IF EXISTS "Users can insert their own payments" ON public.payments;
CREATE POLICY "Evaluators can insert their own payments" ON public.payments
    FOR INSERT WITH CHECK (
        auth.uid() = user_id AND role = 'evaluator'
    );

-- Verify the changes
SELECT role, COUNT(*) as count 
FROM public.payments 
GROUP BY role;
