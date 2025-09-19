-- Allow Evaluators to create/update sensory evaluations and ensure their ratings affect rankings
-- Idempotent-safe policies using DO blocks to avoid duplicate_object errors

-- 1) RLS policies on sensory_evaluations to allow evaluators to manage their own rows
DO $$ BEGIN
  CREATE POLICY "Evaluators can view their own evaluations" ON public.sensory_evaluations
    FOR SELECT USING (
      auth.uid() = judge_id AND EXISTS (
        SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'evaluator'
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Evaluators can insert their own evaluations" ON public.sensory_evaluations
    FOR INSERT WITH CHECK (
      auth.uid() = judge_id AND EXISTS (
        SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'evaluator'
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Evaluators can update their own evaluations" ON public.sensory_evaluations
    FOR UPDATE USING (
      auth.uid() = judge_id AND EXISTS (
        SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'evaluator'
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Note: We intentionally keep the existing judge policies. Both roles share the judge_id column (the evaluator/judge user id).
-- With RLS + unique(sample_id, judge_id), each user can submit one evaluation per sample regardless of role.

-- 2) Ensure Top 10 recomputation includes evaluator rows
-- The existing materialization uses:
--   FROM public.sensory_evaluations se WHERE se.verdict = 'Approved' AND se.overall_quality IS NOT NULL
-- This already includes evaluator rows because they are in the same table. No function change required.
-- We only confirm execute grants exist (already granted to authenticated in top-results-table.sql), but we re-grant defensively.
GRANT EXECUTE ON FUNCTION public.recompute_top_results() TO authenticated;

-- Optional: immediately refresh top_results after enabling evaluator policies
-- This will pick up any evaluator evaluations already in the table
SELECT public.recompute_top_results();