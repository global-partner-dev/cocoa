-- Migration: Fix Contest-Specific Rankings
-- This migration updates the top_results table and recompute function to:
-- 1. Fix table reference from 'samples' to 'sample'
-- 2. Ensure rankings are calculated per contest (using PARTITION BY contest_id)
-- 
-- Run this migration to enable contest-specific rankings in the results dashboards

-- Drop existing table if it has wrong foreign key reference
DROP TABLE IF EXISTS public.top_results CASCADE;

-- Recreate table with correct reference to 'sample' table
CREATE TABLE public.top_results (
  sample_id uuid PRIMARY KEY REFERENCES public.sample(id) ON DELETE CASCADE,
  contest_id uuid REFERENCES public.contests(id) ON DELETE SET NULL,
  average_score numeric(4,2) NOT NULL,
  evaluations_count integer NOT NULL DEFAULT 0,
  latest_evaluation_date date,
  rank integer NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.top_results ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read top results
DROP POLICY IF EXISTS "any authenticated can view top_results" ON public.top_results;
CREATE POLICY "any authenticated can view top_results" ON public.top_results
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
    )
  );

-- Recreate the recompute function with contest-specific rankings
CREATE OR REPLACE FUNCTION public.recompute_top_results()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Clear existing results
  DELETE FROM public.top_results WHERE true;
  
  -- Recompute averages per sample from approved sensory evaluations
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
    SELECT 
      a.sample_id,
      a.avg_score,
      a.eval_count,
      a.latest_date,
      s.contest_id,
      -- IMPORTANT: Partition by contest_id to get independent rankings per contest
      ROW_NUMBER() OVER (PARTITION BY s.contest_id ORDER BY a.avg_score DESC, a.latest_date DESC) AS rk
    FROM aggregated a
    JOIN public.sample s ON s.id = a.sample_id
  )
  INSERT INTO public.top_results (sample_id, contest_id, average_score, evaluations_count, latest_evaluation_date, rank, updated_at)
  SELECT sample_id, contest_id, avg_score, eval_count, latest_date, rk, now()
  FROM ranked
  WHERE rk <= 10;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.recompute_top_results() TO anon, authenticated;

-- Recreate trigger function
CREATE OR REPLACE FUNCTION public.refresh_top_results_trigger()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  PERFORM public.recompute_top_results();
  IF tg_op = 'INSERT' THEN
    RETURN new;
  ELSIF tg_op = 'UPDATE' THEN
    RETURN new;
  ELSE
    RETURN old;
  END IF;
END;
$$;

-- Recreate trigger
DROP TRIGGER IF EXISTS trg_refresh_top_results ON public.sensory_evaluations;
CREATE TRIGGER trg_refresh_top_results
  AFTER INSERT OR UPDATE OR DELETE ON public.sensory_evaluations
  FOR EACH ROW EXECUTE FUNCTION public.refresh_top_results_trigger();

-- Initial populate with contest-specific rankings
SELECT public.recompute_top_results();

-- Verification query (optional - run separately to check results)
-- SELECT 
--   tr.rank,
--   tr.contest_id,
--   c.name as contest_name,
--   s.tracking_code,
--   tr.average_score,
--   tr.evaluations_count
-- FROM public.top_results tr
-- JOIN public.sample s ON s.id = tr.sample_id
-- LEFT JOIN public.contests c ON c.id = tr.contest_id
-- ORDER BY tr.contest_id, tr.rank;