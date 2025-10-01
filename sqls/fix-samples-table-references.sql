-- Fix all references from 'samples' (plural) to 'sample' (singular)
-- This script updates foreign keys, triggers, and functions to use the correct table name

-- 1. Fix notifications table foreign key
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_related_sample_id_fkey;
ALTER TABLE public.notifications 
ADD CONSTRAINT notifications_related_sample_id_fkey 
FOREIGN KEY (related_sample_id) REFERENCES public.sample(id) ON DELETE SET NULL;

-- 2. Fix judge_assignments table foreign key (if not already fixed)
ALTER TABLE public.judge_assignments DROP CONSTRAINT IF EXISTS judge_assignments_sample_id_fkey;
ALTER TABLE public.judge_assignments 
ADD CONSTRAINT judge_assignments_sample_id_fkey 
FOREIGN KEY (sample_id) REFERENCES public.sample(id) ON DELETE CASCADE;

-- 3. Update trg_notify_judge_assignment function to use 'sample' table
CREATE OR REPLACE FUNCTION public.trg_notify_judge_assignment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY definer
AS $$
DECLARE s record; j record;
BEGIN
  SELECT s1.*, p.email as owner_email INTO s
  FROM public.sample s1
  LEFT JOIN public.profiles p ON p.id = s1.user_id
  WHERE s1.id = NEW.sample_id;

  SELECT * INTO j FROM public.profiles WHERE id = NEW.judge_id;

  -- Notify judge
  PERFORM public.notify_user(
    NEW.judge_id, 'sample_assigned_to_judge', 'high',
    'New sample assignment',
    'You have been assigned sample '||coalesce(s.tracking_code,'')||' for evaluation.',
    null, NEW.sample_id, s.contest_id, s.user_id, true, null
  );

  -- Notify participant
  IF s.user_id IS NOT NULL THEN
    PERFORM public.notify_user(
      s.user_id, 'sample_assigned_to_judge', 'medium',
      'Sample assigned to a judge',
      'Your sample '||coalesce(s.tracking_code,'')||' has been assigned to judge '||coalesce(j.name,j.email),
      null, NEW.sample_id, s.contest_id, NEW.judge_id, false, null
    );
  END IF;

  RETURN NEW;
END; $$;

-- 4. Update trg_notify_sensory_evaluation function to use 'sample' table
CREATE OR REPLACE FUNCTION public.trg_notify_sensory_evaluation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY definer
AS $$
DECLARE s record; j record;
BEGIN
  SELECT * INTO s FROM public.sample WHERE id = NEW.sample_id;
  SELECT * INTO j FROM public.profiles WHERE id = NEW.judge_id;

  PERFORM public.broadcast_to_role(
    'admin', 'judge_evaluated_sample', 'medium',
    'Judge submitted an evaluation',
    'Judge '||coalesce(j.name,j.email)||' evaluated sample '||coalesce(NEW.sample_code,'')||'.',
    null, NEW.sample_id, s.contest_id, NEW.judge_id, false, null
  );

  PERFORM public.broadcast_to_role(
    'director', 'judge_evaluated_sample', 'medium',
    'Judge submitted an evaluation',
    'Judge '||coalesce(j.name,j.email)||' evaluated sample '||coalesce(NEW.sample_code,'')||'.',
    null, NEW.sample_id, s.contest_id, NEW.judge_id, false, null
  );

  IF s.user_id IS NOT NULL THEN
    PERFORM public.notify_user(
      s.user_id, 'judge_evaluated_sample', 'medium',
      'Your sample was evaluated by a judge',
      'Judge '||coalesce(j.name,j.email)||' completed evaluation for your sample '||coalesce(NEW.sample_code,'')||'.',
      null, NEW.sample_id, s.contest_id, NEW.judge_id, false, null
    );
  END IF;

  RETURN NEW;
END; $$;

-- 5. Check if there's a trg_notify_final_evaluation function and update it
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'trg_notify_final_evaluation') THEN
    EXECUTE '
      CREATE OR REPLACE FUNCTION public.trg_notify_final_evaluation()
      RETURNS TRIGGER
      LANGUAGE plpgsql
      SECURITY definer
      AS $func$
      DECLARE s record; e record;
      BEGIN
        SELECT * INTO s FROM public.sample WHERE id = NEW.sample_id;
        SELECT * INTO e FROM public.profiles WHERE id = NEW.evaluator_id;

        PERFORM public.broadcast_to_role(
          ''admin'', ''evaluator_evaluated_sample'', ''medium'',
          ''Evaluator submitted a final evaluation'',
          ''Evaluator ''||coalesce(e.name,e.email)||'' evaluated sample ''||coalesce(NEW.sample_code,'''')||''.'',
          null, NEW.sample_id, s.contest_id, NEW.evaluator_id, false, null
        );

        PERFORM public.broadcast_to_role(
          ''director'', ''evaluator_evaluated_sample'', ''medium'',
          ''Evaluator submitted a final evaluation'',
          ''Evaluator ''||coalesce(e.name,e.email)||'' evaluated sample ''||coalesce(NEW.sample_code,'''')||''.'',
          null, NEW.sample_id, s.contest_id, NEW.evaluator_id, false, null
        );

        IF s.user_id IS NOT NULL THEN
          PERFORM public.notify_user(
            s.user_id, ''evaluator_evaluated_sample'', ''medium'',
            ''Your sample received a final evaluation'',
            ''Evaluator ''||coalesce(e.name,e.email)||'' completed final evaluation for your sample ''||coalesce(NEW.sample_code,'''')||''.'',
            null, NEW.sample_id, s.contest_id, NEW.evaluator_id, false, null
          );
        END IF;

        RETURN NEW;
      END; $func$;
    ';
  END IF;
END $$;

-- 6. Check if there's a trg_notify_top_results function and update it
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'trg_notify_top_results') THEN
    EXECUTE '
      CREATE OR REPLACE FUNCTION public.trg_notify_top_results()
      RETURNS TRIGGER
      LANGUAGE plpgsql
      SECURITY definer
      AS $func$
      DECLARE s record;
      BEGIN
        IF NEW.rank <= 3 THEN
          SELECT * INTO s FROM public.sample WHERE id = NEW.sample_id;
          IF s.user_id IS NOT NULL THEN
            PERFORM public.notify_user(
              s.user_id, ''final_ranking_top3'', ''high'',
              ''Congratulations! Your sample ranked in top 3'',
              ''Your sample ranked #''||NEW.rank||'' with an average score of ''||NEW.average_score||''.'',
              null, NEW.sample_id, NEW.contest_id, null, true, null
            );
          END IF;
        END IF;
        RETURN NEW;
      END; $func$;
    ';
  END IF;
END $$;

-- 7. Verify the changes
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
    AND ccu.table_name = 'sample'
ORDER BY tc.table_name, kcu.column_name;

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'All references to "samples" table have been updated to "sample" table!';
    RAISE NOTICE 'Foreign keys, triggers, and functions have been fixed.';
END $$;