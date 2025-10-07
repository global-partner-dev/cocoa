-- Fix the final_evaluations trigger to use sample.tracking_code instead of NEW.sample_code
-- The final_evaluations table doesn't have a sample_code column
-- The sample table uses tracking_code as the unique identifier
-- Run this in Supabase SQL editor

CREATE OR REPLACE FUNCTION public.trg_notify_final_evaluation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY definer
AS $func$
DECLARE 
  s record; 
  e record;
BEGIN
  -- Get sample information
  SELECT * INTO s FROM public.sample WHERE id = NEW.sample_id;
  -- Get evaluator information
  SELECT * INTO e FROM public.profiles WHERE id = NEW.evaluator_id;

  -- Notify admins
  PERFORM public.broadcast_to_role(
    'admin', 
    'evaluator_evaluated_sample', 
    'medium',
    'Evaluator submitted a final evaluation',
    'Evaluator '||COALESCE(e.name, e.email)||' evaluated sample '||COALESCE(s.tracking_code, '')||'.',
    null, 
    NEW.sample_id, 
    s.contest_id, 
    NEW.evaluator_id, 
    false, 
    null
  );

  -- Notify directors
  PERFORM public.broadcast_to_role(
    'director', 
    'evaluator_evaluated_sample', 
    'medium',
    'Evaluator submitted a final evaluation',
    'Evaluator '||COALESCE(e.name, e.email)||' evaluated sample '||COALESCE(s.tracking_code, '')||'.',
    null, 
    NEW.sample_id, 
    s.contest_id, 
    NEW.evaluator_id, 
    false, 
    null
  );

  -- Notify sample owner if exists
  IF s.user_id IS NOT NULL THEN
    PERFORM public.notify_user(
      s.user_id, 
      'evaluator_evaluated_sample', 
      'medium',
      'Your sample received a final evaluation',
      'Evaluator '||COALESCE(e.name, e.email)||' completed final evaluation for your sample '||COALESCE(s.tracking_code, '')||'.',
      null, 
      NEW.sample_id, 
      s.contest_id, 
      NEW.evaluator_id, 
      false, 
      null
    );
  END IF;

  RETURN NEW;
END; 
$func$;

-- Ensure the trigger is attached to the final_evaluations table
DROP TRIGGER IF EXISTS notify_final_evaluation ON public.final_evaluations;
CREATE TRIGGER notify_final_evaluation
  AFTER INSERT ON public.final_evaluations
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_notify_final_evaluation();