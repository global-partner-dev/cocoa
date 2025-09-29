-- Comprehensive migration to fix all foreign key relationships after samples -> sample table migration
-- This script updates all tables that were referencing the old 'samples' table to reference the new 'sample' table

-- 1. Fix top_results table foreign key constraint
ALTER TABLE public.top_results DROP CONSTRAINT IF EXISTS top_results_sample_id_fkey;

-- Add new foreign key constraint pointing to the sample table
ALTER TABLE public.top_results 
ADD CONSTRAINT top_results_sample_id_fkey 
FOREIGN KEY (sample_id) REFERENCES public.sample(id) ON DELETE CASCADE;

-- 2. Fix final_evaluations table foreign key constraint
ALTER TABLE public.final_evaluations DROP CONSTRAINT IF EXISTS final_evaluations_sample_id_fkey;

-- Add new foreign key constraint pointing to the sample table
ALTER TABLE public.final_evaluations 
ADD CONSTRAINT final_evaluations_sample_id_fkey 
FOREIGN KEY (sample_id) REFERENCES public.sample(id) ON DELETE CASCADE;

-- 3. Fix judge_assignments table foreign key constraint
ALTER TABLE public.judge_assignments DROP CONSTRAINT IF EXISTS judge_assignments_sample_id_fkey;

-- Add new foreign key constraint pointing to the sample table
ALTER TABLE public.judge_assignments 
ADD CONSTRAINT judge_assignments_sample_id_fkey 
FOREIGN KEY (sample_id) REFERENCES public.sample(id) ON DELETE CASCADE;

-- 4. Fix payments table foreign key constraint
ALTER TABLE public.payments DROP CONSTRAINT IF EXISTS payments_sample_id_fkey;

-- Add new foreign key constraint pointing to the sample table
ALTER TABLE public.payments 
ADD CONSTRAINT payments_sample_id_fkey 
FOREIGN KEY (sample_id) REFERENCES public.sample(id) ON DELETE SET NULL;

-- 5. Update the recompute_top_results function to use the correct table
CREATE OR REPLACE FUNCTION public.recompute_top_results()
RETURNS void
LANGUAGE plpgsql
SECURITY definer
AS $$
BEGIN
  -- Recompute averages per sample from approved sensory evaluations
  -- Use a guarded DELETE (with WHERE) to satisfy PostgREST protection
  DELETE FROM public.top_results WHERE true;
  
  WITH aggregated AS (
    SELECT
      se.sample_id,
      AVG(se.overall_quality)::numeric(4,2) AS avg_score,
      COUNT(*)::int AS eval_count,
      MAX(se.evaluation_date) AS latest_date
    FROM public.sensory_evaluations se
    WHERE se.verdict = 'Approved'
      AND se.overall_quality IS NOT NULL
    GROUP BY se.sample_id
  ), ranked AS (
    SELECT a.sample_id,
           a.avg_score,
           a.eval_count,
           a.latest_date,
           s.contest_id,
           ROW_NUMBER() OVER (ORDER BY a.avg_score DESC, a.latest_date DESC) AS rk
    FROM aggregated a
    JOIN public.sample s ON s.id = a.sample_id  -- Fixed: changed from 'samples' to 'sample'
  )
  INSERT INTO public.top_results (sample_id, contest_id, average_score, evaluations_count, latest_evaluation_date, rank, updated_at)
  SELECT sample_id, contest_id, avg_score, eval_count, latest_date, rk, NOW()
  FROM ranked
  WHERE rk <= 10;
END;
$$;

-- 6. Refresh the top_results table with the corrected function
SELECT public.recompute_top_results();

-- 7. Check if sensory_evaluations table also needs fixing (it should already reference sample correctly)
-- If there are any issues with sensory_evaluations, uncomment the following lines:
-- ALTER TABLE public.sensory_evaluations DROP CONSTRAINT IF EXISTS sensory_evaluations_sample_id_fkey;
-- ALTER TABLE public.sensory_evaluations 
-- ADD CONSTRAINT sensory_evaluations_sample_id_fkey 
-- FOREIGN KEY (sample_id) REFERENCES public.sample(id) ON DELETE CASCADE;

-- 8. Verify all foreign key constraints are properly set
-- This query will show all foreign key constraints related to the sample table
SELECT 
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name,
    tc.constraint_name
FROM 
    information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
    AND (ccu.table_name = 'sample' OR tc.table_name IN ('top_results', 'final_evaluations', 'judge_assignments', 'payments'))
ORDER BY tc.table_name, kcu.column_name;

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'Foreign key migration completed successfully!';
    RAISE NOTICE 'All tables now properly reference the new "sample" table.';
    RAISE NOTICE 'Top results have been recomputed with the corrected function.';
END $$;