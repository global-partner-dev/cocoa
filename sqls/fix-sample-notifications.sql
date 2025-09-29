-- Fix sample status notification triggers for the new 'sample' table structure
-- This replaces the old triggers that referenced the 'samples' table

-- Drop old triggers if they exist (they won't work with the new table structure anyway)
DROP TRIGGER IF EXISTS trg_notify_sample_added ON public.samples;
DROP TRIGGER IF EXISTS trg_notify_sample_status ON public.samples;

-- Drop old functions
DROP FUNCTION IF EXISTS public.trg_notify_sample_added();
DROP FUNCTION IF EXISTS public.trg_notify_sample_status();

-- Create new trigger function for sample added (INSERT on sample table)
CREATE OR REPLACE FUNCTION public.trg_notify_sample_added()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE 
  owner_email text;
  owner_name text;
BEGIN
  -- Get owner details
  SELECT email, name INTO owner_email, owner_name 
  FROM public.profiles 
  WHERE id = NEW.user_id;
  
  -- Notify admins
  PERFORM public.broadcast_to_role(
    'admin', 'sample_added', 'high',
    'New sample added',
    'Sample ' || NEW.tracking_code || ' was submitted by ' || COALESCE(owner_name, owner_email, 'unknown'),
    NULL, NEW.id, NEW.contest_id, NEW.user_id, false, NULL
  );
  
  -- Notify directors
  PERFORM public.broadcast_to_role(
    'director', 'sample_added', 'high',
    'New sample added',
    'Sample ' || NEW.tracking_code || ' was submitted by ' || COALESCE(owner_name, owner_email, 'unknown'),
    NULL, NEW.id, NEW.contest_id, NEW.user_id, false, NULL
  );
  
  RETURN NEW;
END; 
$$;

-- Create new trigger function for sample status changes (UPDATE on sample table)
CREATE OR REPLACE FUNCTION public.trg_notify_sample_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  pe record;
  reasons_text text;
  details_text text;
  pe_found boolean := false;
BEGIN
  -- Only trigger if status actually changed
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    
    -- Handle 'received' status
    IF NEW.status = 'received' THEN
      PERFORM public.notify_user(
        NEW.user_id, 'sample_received', 'medium',
        'Sample received',
        'Your sample ' || NEW.tracking_code || ' has been received at the facility.',
        NULL, NEW.id, NEW.contest_id, NULL, false, NULL
      );
    
    -- Handle 'disqualified' status
    ELSIF NEW.status = 'disqualified' THEN
      -- Fetch disqualification reasons and notes from physical evaluations
      SELECT disqualification_reasons, notes INTO pe
      FROM public.physical_evaluations
      WHERE sample_id = NEW.id;
      pe_found := FOUND;

      reasons_text := NULL;
      details_text := NULL;
      
      IF pe_found THEN
        IF pe.disqualification_reasons IS NOT NULL AND array_length(pe.disqualification_reasons, 1) > 0 THEN
          reasons_text := array_to_string(pe.disqualification_reasons, '; ');
        END IF;
        details_text := pe.notes;
      END IF;

      PERFORM public.notify_user(
        NEW.user_id, 'sample_disqualified', 'high',
        'Sample did not pass physical evaluation',
        'Your sample ' || NEW.tracking_code || ' was disqualified during physical evaluation' ||
        CASE WHEN reasons_text IS NOT NULL THEN ': ' || reasons_text ELSE '.' END,
        details_text, NEW.id, NEW.contest_id, NULL, true, NULL
      );
    
    -- Handle 'approved' status
    ELSIF NEW.status = 'approved' THEN
      PERFORM public.notify_user(
        NEW.user_id, 'sample_approved', 'medium',
        'Sample approved',
        'Your sample ' || NEW.tracking_code || ' passed physical evaluation and is approved.',
        NULL, NEW.id, NEW.contest_id, NULL, false, NULL
      );
    
    -- Handle 'evaluated' status
    ELSIF NEW.status = 'evaluated' THEN
      PERFORM public.notify_user(
        NEW.user_id, 'sample_approved', 'medium',
        'Sample evaluation completed',
        'Your sample ' || NEW.tracking_code || ' has completed all evaluations.',
        NULL, NEW.id, NEW.contest_id, NULL, false, NULL
      );
    
    END IF;
  END IF;
  
  RETURN NEW;
END; 
$$;

-- Create triggers on the new 'sample' table
CREATE TRIGGER trg_notify_sample_added
  AFTER INSERT ON public.sample
  FOR EACH ROW 
  WHEN (NEW.status != 'draft')  -- Only notify for non-draft samples
  EXECUTE FUNCTION public.trg_notify_sample_added();

CREATE TRIGGER trg_notify_sample_status
  AFTER UPDATE ON public.sample
  FOR EACH ROW 
  EXECUTE FUNCTION public.trg_notify_sample_status();

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.trg_notify_sample_added() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.trg_notify_sample_status() TO anon, authenticated;