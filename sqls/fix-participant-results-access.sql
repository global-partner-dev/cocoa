-- Fix participant access to results
-- This script allows participants to view all results, same as other roles

-- Update the samples table policy to allow participants to view all samples for results
DROP POLICY IF EXISTS "Staff can view all samples" ON public.samples;
CREATE POLICY "Staff and participants can view all samples" ON public.samples
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'director', 'judge', 'evaluator', 'participant')
        )
    );

-- Update the sensory evaluations policy to allow participants to view all evaluations for results
DROP POLICY IF EXISTS "Staff can view all sensory evaluations" ON public.sensory_evaluations;
CREATE POLICY "Staff and participants can view all sensory evaluations" ON public.sensory_evaluations
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'director', 'evaluator', 'participant')
        )
    );

-- Also update physical evaluations policy if it exists to include participants
DROP POLICY IF EXISTS "Directors and admins can view all physical evaluations" ON public.physical_evaluations;
CREATE POLICY "Staff and participants can view all physical evaluations" ON public.physical_evaluations
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'director', 'evaluator', 'participant')
        )
    );

-- Verification query to check the policies
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies 
WHERE tablename IN ('samples', 'sensory_evaluations', 'physical_evaluations')
AND policyname LIKE '%view%'
ORDER BY tablename, policyname;