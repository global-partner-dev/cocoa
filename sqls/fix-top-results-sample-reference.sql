-- Fix top_results table to reference the new 'sample' table instead of old 'samples' table
-- Run this in Supabase SQL editor after migrating to the new sample schema

-- 1) Drop the existing foreign key constraint
ALTER TABLE public.top_results DROP CONSTRAINT IF EXISTS top_results_sample_id_fkey;

-- 2) Add new foreign key constraint to reference the 'sample' table
ALTER TABLE public.top_results 
ADD CONSTRAINT top_results_sample_id_fkey 
FOREIGN KEY (sample_id) REFERENCES public.sample(id) ON DELETE CASCADE;

-- 3) Update the recompute function to reference the new 'sample' table
CREATE OR REPLACE FUNCTION public.recompute_top_results()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Recompute averages per sample from approved sensory evaluations
  -- Use a guarded DELETE (with WHERE) to satisfy PostgREST protection
  DELETE FROM public.top_results WHERE true;
  
  WITH aggregated AS (
    SELECT
      se.sample_id,
      avg(se.overall_quality)::numeric(4,2) AS avg_score,
      count(*)::int AS eval_count,
      max(se.evaluation_date) AS latest_date
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
           row_number() OVER (ORDER BY a.avg_score DESC, a.latest_date DESC) AS rk
    FROM aggregated a
    JOIN public.sample s ON s.id = a.sample_id  -- Changed from 'samples' to 'sample'
  )
  INSERT INTO public.top_results (sample_id, contest_id, average_score, evaluations_count, latest_evaluation_date, rank, updated_at)
  SELECT sample_id, contest_id, avg_score, eval_count, latest_date, rk, now()
  FROM ranked
  WHERE rk <= 10;
END;
$$;

-- 4) Refresh the top_results table with the corrected function
SELECT public.recompute_top_results();