-- Multi-Contest Architecture: Director Restrictions
-- This migration implements director-specific contest management rules

-- ============================================================================
-- 1. Update RLS Policies for Contests Table
-- ============================================================================

-- Drop existing policies that allow all directors to manage all contests
DROP POLICY IF EXISTS "Admins and directors can view all contests" ON public.contests;
DROP POLICY IF EXISTS "Admins and directors can update contests" ON public.contests;
DROP POLICY IF EXISTS "Admins and directors can delete contests" ON public.contests;

-- Admins can view all contests, directors can only view their own
CREATE POLICY "Admins can view all contests, directors view own" ON public.contests
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() 
            AND (
                role = 'admin' 
                OR (role = 'director' AND contests.created_by = auth.uid())
            )
        )
    );

-- Directors can only update their own contests, admins can update all
CREATE POLICY "Admins update all, directors update own contests" ON public.contests
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() 
            AND (
                role = 'admin' 
                OR (role = 'director' AND contests.created_by = auth.uid())
            )
        )
    );

-- Directors can only delete their own contests, admins can delete all
CREATE POLICY "Admins delete all, directors delete own contests" ON public.contests
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() 
            AND (
                role = 'admin' 
                OR (role = 'director' AND contests.created_by = auth.uid())
            )
        )
    );

-- ============================================================================
-- 2. Function to Check if Director Has Active Contest
-- ============================================================================

CREATE OR REPLACE FUNCTION public.director_has_active_contest(director_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    active_count INTEGER;
BEGIN
    -- Count active contests created by this director
    -- A contest is active if current date is between start_date and end_date
    SELECT COUNT(*) INTO active_count
    FROM public.contests
    WHERE created_by = director_id
    AND CURRENT_DATE >= start_date
    AND CURRENT_DATE <= end_date;
    
    RETURN active_count > 0;
END;
$$;

GRANT EXECUTE ON FUNCTION public.director_has_active_contest(UUID) TO authenticated;

-- ============================================================================
-- 3. Constraint to Prevent Directors from Creating Multiple Active Contests
-- ============================================================================

CREATE OR REPLACE FUNCTION public.check_director_active_contest()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    user_role TEXT;
    has_active BOOLEAN;
BEGIN
    -- Get the role of the user creating the contest
    SELECT role INTO user_role
    FROM public.profiles
    WHERE id = NEW.created_by;
    
    -- Only check for directors (admins can create unlimited contests)
    IF user_role = 'director' THEN
        -- Check if this director already has an active contest
        has_active := public.director_has_active_contest(NEW.created_by);
        
        IF has_active THEN
            RAISE EXCEPTION 'Director already has an active contest. Only one active contest per director is allowed.';
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_check_director_active_contest ON public.contests;
CREATE TRIGGER trg_check_director_active_contest
    BEFORE INSERT ON public.contests
    FOR EACH ROW
    EXECUTE FUNCTION public.check_director_active_contest();

-- ============================================================================
-- 4. Update Notification Triggers to Filter by Contest Director
-- ============================================================================

-- Update sample_added notification to only notify the contest's director
CREATE OR REPLACE FUNCTION public.trg_notify_sample_added()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE 
    owner_email TEXT;
    contest_director UUID;
BEGIN
    SELECT email INTO owner_email FROM public.profiles WHERE id = NEW.user_id;
    SELECT created_by INTO contest_director FROM public.contests WHERE id = NEW.contest_id;
    
    -- Notify admins
    PERFORM public.broadcast_to_role(
        'admin', 'sample_added', 'high',
        'New sample added',
        'Sample '||NEW.tracking_code||' was submitted by '||COALESCE(owner_email,'unknown'),
        NULL, NEW.id, NEW.contest_id, NEW.user_id, false, NULL
    );
    
    -- Notify only the director who created this contest
    IF contest_director IS NOT NULL THEN
        PERFORM public.notify_user(
            contest_director,
            'sample_added', 'high',
            'New sample added',
            'Sample '||NEW.tracking_code||' was submitted by '||COALESCE(owner_email,'unknown'),
            NULL, NEW.id, NEW.contest_id, NEW.user_id, false, NULL
        );
    END IF;
    
    RETURN NEW;
END;
$$;

-- Update judge evaluation notification to only notify the contest's director
CREATE OR REPLACE FUNCTION public.trg_notify_sensory_evaluation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE 
    s RECORD; 
    j RECORD;
    contest_director UUID;
BEGIN
    SELECT * INTO s FROM public.sample WHERE id = NEW.sample_id;
    SELECT * INTO j FROM public.profiles WHERE id = NEW.judge_id;
    SELECT created_by INTO contest_director FROM public.contests WHERE id = s.contest_id;
    
    -- Notify admins
    PERFORM public.broadcast_to_role(
        'admin', 'judge_evaluated_sample', 'medium',
        'Judge submitted an evaluation',
        'Judge '||COALESCE(j.name,j.email)||' evaluated sample '||COALESCE(NEW.sample_code,'')||'.',
        NULL, NEW.sample_id, s.contest_id, NEW.judge_id, false, NULL
    );
    
    -- Notify only the director who created this contest
    IF contest_director IS NOT NULL THEN
        PERFORM public.notify_user(
            contest_director,
            'judge_evaluated_sample', 'medium',
            'Judge submitted an evaluation',
            'Judge '||COALESCE(j.name,j.email)||' evaluated sample '||COALESCE(NEW.sample_code,'')||'.',
            NULL, NEW.sample_id, s.contest_id, NEW.judge_id, false, NULL
        );
    END IF;
    
    -- Notify participant
    IF s.user_id IS NOT NULL THEN
        PERFORM public.notify_user(
            s.user_id, 'judge_evaluated_sample', 'medium',
            'Your sample was evaluated by a judge',
            'Judge '||COALESCE(j.name,j.email)||' completed evaluation for your sample '||COALESCE(NEW.sample_code,'')||'.',
            NULL, NEW.sample_id, s.contest_id, NEW.judge_id, false, NULL
        );
    END IF;
    
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_sensory_evaluation ON public.sensory_evaluations;
CREATE TRIGGER trg_notify_sensory_evaluation
    AFTER INSERT ON public.sensory_evaluations
    FOR EACH ROW EXECUTE FUNCTION public.trg_notify_sensory_evaluation();

-- Update final evaluation notification to only notify the contest's director
CREATE OR REPLACE FUNCTION public.trg_notify_final_evaluation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE 
    s RECORD; 
    e RECORD;
    contest_director UUID;
BEGIN
    SELECT * INTO s FROM public.sample WHERE id = NEW.sample_id;
    SELECT * INTO e FROM public.profiles WHERE id = NEW.evaluator_id;
    SELECT created_by INTO contest_director FROM public.contests WHERE id = s.contest_id;
    
    -- Notify admins
    PERFORM public.broadcast_to_role(
        'admin', 'evaluator_evaluated_sample', 'medium',
        'Evaluator submitted a final evaluation',
        'Evaluator '||COALESCE(e.name,e.email)||' evaluated sample '||COALESCE(NEW.sample_id::text,'')||'.',
        NULL, NEW.sample_id, s.contest_id, NEW.evaluator_id, false, NULL
    );
    
    -- Notify only the director who created this contest
    IF contest_director IS NOT NULL THEN
        PERFORM public.notify_user(
            contest_director,
            'evaluator_evaluated_sample', 'medium',
            'Evaluator submitted a final evaluation',
            'Evaluator '||COALESCE(e.name,e.email)||' evaluated sample '||COALESCE(NEW.sample_id::text,'')||'.',
            NULL, NEW.sample_id, s.contest_id, NEW.evaluator_id, false, NULL
        );
    END IF;
    
    -- Notify participant
    IF s.user_id IS NOT NULL THEN
        PERFORM public.notify_user(
            s.user_id, 'evaluator_evaluated_sample', 'medium',
            'Your sample was evaluated by an evaluator',
            'Evaluator '||COALESCE(e.name,e.email)||' completed a final evaluation for your sample.',
            NULL, NEW.sample_id, s.contest_id, NEW.evaluator_id, false, NULL
        );
    END IF;
    
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_final_evaluation ON public.final_evaluations;
CREATE TRIGGER trg_notify_final_evaluation
    AFTER INSERT ON public.final_evaluations
    FOR EACH ROW EXECUTE FUNCTION public.trg_notify_final_evaluation();

-- ============================================================================
-- 5. Contest Expiration and Data Cleanup
-- ============================================================================

CREATE OR REPLACE FUNCTION public.cleanup_expired_contests()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    expired_contest RECORD;
    deleted_samples_count INTEGER;
    deleted_rankings_count INTEGER;
BEGIN
    -- Find all contests that have expired (end_date is in the past)
    FOR expired_contest IN 
        SELECT id, name, end_date 
        FROM public.contests 
        WHERE end_date < CURRENT_DATE
    LOOP
        -- Delete rankings for this contest
        DELETE FROM public.top_results 
        WHERE contest_id = expired_contest.id;
        GET DIAGNOSTICS deleted_rankings_count = ROW_COUNT;
        
        -- Delete samples for this contest (cascade will handle related data)
        DELETE FROM public.sample 
        WHERE contest_id = expired_contest.id;
        GET DIAGNOSTICS deleted_samples_count = ROW_COUNT;
        
        -- Log the cleanup
        RAISE NOTICE 'Cleaned up expired contest: % (ended: %). Deleted % samples and % rankings.',
            expired_contest.name, 
            expired_contest.end_date,
            deleted_samples_count,
            deleted_rankings_count;
        
        -- Delete the contest itself
        DELETE FROM public.contests WHERE id = expired_contest.id;
    END LOOP;
END;
$$;

GRANT EXECUTE ON FUNCTION public.cleanup_expired_contests() TO authenticated;

-- Note: To schedule this function to run automatically, you would need to set up
-- a cron job using pg_cron extension or call it from your application periodically.
-- Example with pg_cron (if extension is available):
-- SELECT cron.schedule('cleanup-expired-contests', '0 2 * * *', 'SELECT public.cleanup_expired_contests()');

-- ============================================================================
-- 6. Helper Function to Get Director's Contests
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_director_contests(director_id UUID)
RETURNS TABLE (
    id UUID,
    name TEXT,
    description TEXT,
    location TEXT,
    start_date DATE,
    end_date DATE,
    sample_price DECIMAL,
    created_at TIMESTAMPTZ,
    is_active BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.id,
        c.name,
        c.description,
        c.location,
        c.start_date,
        c.end_date,
        c.sample_price,
        c.created_at,
        (CURRENT_DATE >= c.start_date AND CURRENT_DATE <= c.end_date) as is_active
    FROM public.contests c
    WHERE c.created_by = director_id
    ORDER BY c.created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_director_contests(UUID) TO authenticated;

-- ============================================================================
-- 7. Update Rankings to be Per-Contest
-- ============================================================================

-- The top_results table already has contest_id, but let's ensure rankings are computed per contest
CREATE OR REPLACE FUNCTION public.recompute_top_results()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Clear existing results
    DELETE FROM public.top_results WHERE true;
    
    -- Recompute rankings per contest
    WITH aggregated AS (
        SELECT
            se.sample_id,
            AVG(se.overall_quality)::numeric(4,2) as avg_score,
            COUNT(*)::int as eval_count,
            MAX(se.evaluation_date) as latest_date
        FROM public.sensory_evaluations se
        WHERE se.verdict = 'Approved'
            AND se.overall_quality IS NOT NULL
        GROUP BY se.sample_id
    ), 
    ranked AS (
        SELECT 
            a.sample_id,
            a.avg_score,
            a.eval_count,
            a.latest_date,
            s.contest_id,
            ROW_NUMBER() OVER (
                PARTITION BY s.contest_id 
                ORDER BY a.avg_score DESC, a.latest_date DESC
            ) as rk
        FROM aggregated a
        JOIN public.sample s ON s.id = a.sample_id
    )
    INSERT INTO public.top_results (
        sample_id, 
        contest_id, 
        average_score, 
        evaluations_count, 
        latest_evaluation_date, 
        rank, 
        updated_at
    )
    SELECT 
        sample_id, 
        contest_id, 
        avg_score, 
        eval_count, 
        latest_date, 
        rk::integer, 
        NOW()
    FROM ranked
    WHERE rk <= 10;  -- Top 10 per contest
END;
$$;

-- Recompute rankings with new per-contest logic
SELECT public.recompute_top_results();

-- ============================================================================
-- 8. Add Index for Better Performance
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_contests_created_by ON public.contests(created_by);
CREATE INDEX IF NOT EXISTS idx_contests_dates ON public.contests(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_top_results_contest_id ON public.top_results(contest_id);

-- ============================================================================
-- Summary
-- ============================================================================

-- This migration implements:
-- 1. Director-specific contest access control (directors only see/manage their own contests)
-- 2. Validation to prevent directors from creating multiple active contests
-- 3. Notification filtering (directors only receive notifications for their contests)
-- 4. Contest expiration cleanup function
-- 5. Per-contest ranking system
-- 6. Helper functions for director contest management

COMMENT ON FUNCTION public.director_has_active_contest IS 'Check if a director has any active contests';
COMMENT ON FUNCTION public.check_director_active_contest IS 'Trigger function to prevent directors from creating multiple active contests';
COMMENT ON FUNCTION public.cleanup_expired_contests IS 'Delete expired contests and their associated data (samples, rankings)';
COMMENT ON FUNCTION public.get_director_contests IS 'Get all contests created by a specific director';