-- Notifications schema, RLS, helper functions and event triggers
-- Requires: pgcrypto, existing tables: profiles, samples, contests, judge_assignments, sensory_evaluations, final_evaluations, top_results

create extension if not exists pgcrypto;

-- 1) Notifications table (per-recipient row for read/delete state)
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_user_id uuid not null references public.profiles(id) on delete cascade,

  -- classification
  type text not null check (type in (
    'user_registered',
    'sample_added',
    'sample_received',
    'sample_disqualified',
    'sample_approved',
    'sample_assigned_to_judge',
    'judge_evaluated_sample',
    'evaluator_evaluated_sample',
    'contest_created',
    'contest_completed',
    'contest_final_stage',
    'final_ranking_top3'
  )),
  priority text not null default 'medium' check (priority in ('low','medium','high','urgent')),

  -- content
  title text not null,
  message text not null,
  details text,

  -- relations
  related_sample_id uuid references public.samples(id) on delete set null,
  related_contest_id uuid references public.contests(id) on delete set null,
  related_user_id uuid references public.profiles(id) on delete set null,

  action_required boolean not null default false,
  expires_at timestamptz,
  read boolean not null default false,
  is_deleted boolean not null default false,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- indexes
create index if not exists idx_notifications_recipient on public.notifications(recipient_user_id);
create index if not exists idx_notifications_created on public.notifications(created_at desc);

-- updated_at trigger helper (assumes public.handle_updated_at exists)
DO $$ BEGIN
  CREATE TRIGGER handle_updated_at_notifications
  BEFORE UPDATE ON public.notifications
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
EXCEPTION WHEN undefined_function THEN
  -- Create a generic updated_at function if missing
  CREATE OR REPLACE FUNCTION public.handle_updated_at()
  RETURNS trigger AS $fn$
  BEGIN
    NEW.updated_at = now();
    RETURN NEW;
  END;
  $fn$ LANGUAGE plpgsql;
  CREATE TRIGGER handle_updated_at_notifications
  BEFORE UPDATE ON public.notifications
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
END $$;

-- 2) RLS: recipients can see and manage their own notifications
alter table public.notifications enable row level security;

DO $$ BEGIN
  CREATE POLICY "recipient can read own notifications" ON public.notifications
    FOR SELECT USING (recipient_user_id = auth.uid() AND is_deleted = false);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "recipient can update own notifications" ON public.notifications
    FOR UPDATE USING (recipient_user_id = auth.uid())
    WITH CHECK (recipient_user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- No direct INSERT/DELETE by clients; inserts are done via SECURITY DEFINER functions/triggers

-- 3) Helper functions to insert notifications
create or replace function public.notify_user(
  p_user_id uuid,
  p_type text,
  p_priority text,
  p_title text,
  p_message text,
  p_details text default null,
  p_sample_id uuid default null,
  p_contest_id uuid default null,
  p_related_user_id uuid default null,
  p_action_required boolean default false,
  p_expires_at timestamptz default null
) returns void
language plpgsql
security definer
as $$
begin
  insert into public.notifications(
    recipient_user_id, type, priority, title, message, details,
    related_sample_id, related_contest_id, related_user_id,
    action_required, expires_at
  ) values (
    p_user_id, p_type, p_priority, p_title, p_message, p_details,
    p_sample_id, p_contest_id, p_related_user_id,
    p_action_required, p_expires_at
  );
end;
$$;

grant execute on function public.notify_user(uuid,text,text,text,text,text,uuid,uuid,uuid,boolean,timestamptz) to anon, authenticated;

-- Broadcast to all users with a given role
create or replace function public.broadcast_to_role(
  p_role text,
  p_type text,
  p_priority text,
  p_title text,
  p_message text,
  p_details text default null,
  p_sample_id uuid default null,
  p_contest_id uuid default null,
  p_related_user_id uuid default null,
  p_action_required boolean default false,
  p_expires_at timestamptz default null
) returns void
language plpgsql
security definer
as $$
begin
  insert into public.notifications(
    recipient_user_id, type, priority, title, message, details,
    related_sample_id, related_contest_id, related_user_id,
    action_required, expires_at
  )
  select p.id, p_type, p_priority, p_title, p_message, p_details,
         p_sample_id, p_contest_id, p_related_user_id,
         p_action_required, p_expires_at
  from public.profiles p
  where p.role = p_role;
end;
$$;

grant execute on function public.broadcast_to_role(text,text,text,text,text,text,uuid,uuid,uuid,boolean,timestamptz) to anon, authenticated;

-- 4) Event triggers to generate notifications

-- A) New user registration -> Admins
create or replace function public.trg_notify_new_user()
returns trigger
language plpgsql
security definer
as $$
begin
  perform public.broadcast_to_role(
    'admin',
    'user_registered', 'medium',
    'New user registered',
    coalesce(NEW.name, NEW.email)||' has registered and awaits verification',
    null, null, null, NEW.id, true, null
  );
  return NEW;
end; $$;

DROP TRIGGER IF EXISTS trg_notify_new_user ON public.profiles;
CREATE TRIGGER trg_notify_new_user
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.trg_notify_new_user();

-- B) New sample added -> Admins and Directors
create or replace function public.trg_notify_sample_added()
returns trigger
language plpgsql
security definer
as $$
DECLARE owner_email text;
BEGIN
  select email into owner_email from public.profiles where id = NEW.user_id;
  perform public.broadcast_to_role(
    'admin', 'sample_added', 'high',
    'New sample added',
    'Sample '||NEW.tracking_code||' was submitted by '||coalesce(owner_email,'unknown'),
    null, NEW.id, NEW.contest_id, NEW.user_id, false, null
  );
  perform public.broadcast_to_role(
    'director', 'sample_added', 'high',
    'New sample added',
    'Sample '||NEW.tracking_code||' was submitted by '||coalesce(owner_email,'unknown'),
    null, NEW.id, NEW.contest_id, NEW.user_id, false, null
  );
  return NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_notify_sample_added ON public.samples;
CREATE TRIGGER trg_notify_sample_added
  AFTER INSERT ON public.samples
  FOR EACH ROW EXECUTE FUNCTION public.trg_notify_sample_added();

-- C) Sample status changes -> Participant
create or replace function public.trg_notify_sample_status()
returns trigger
language plpgsql
security definer
as $$
declare
  pe record;
  reasons_text text;
  details_text text;
  pe_found boolean := false;
begin
  if NEW.status is distinct from OLD.status then
    if NEW.status = 'received' then
      perform public.notify_user(
        NEW.user_id, 'sample_received', 'medium',
        'Sample received',
        'Your sample '||NEW.tracking_code||' has been received at the facility.',
        null, NEW.id, NEW.contest_id, null, false, null
      );
    elsif NEW.status = 'disqualified' then
      -- Fetch disqualification reasons and notes, if available
      select disqualification_reasons, notes into pe
      from public.physical_evaluations
      where sample_id = NEW.id;
      pe_found := FOUND;

      reasons_text := null;
      details_text := null;
      if pe_found then
        if pe.disqualification_reasons is not null and array_length(pe.disqualification_reasons, 1) > 0 then
          reasons_text := array_to_string(pe.disqualification_reasons, '; ');
        end if;
        details_text := pe.notes;
      end if;

      perform public.notify_user(
        NEW.user_id, 'sample_disqualified', 'high',
        'Sample did not pass physical evaluation',
        'Your sample '||NEW.tracking_code||' was disqualified during physical evaluation'
        || case when reasons_text is not null then ': '||reasons_text else '.' end,
        details_text, NEW.id, NEW.contest_id, null, true, null
      );
    elsif NEW.status = 'approved' then
      perform public.notify_user(
        NEW.user_id, 'sample_approved', 'medium',
        'Sample approved',
        'Your sample '||NEW.tracking_code||' passed physical evaluation and is approved.',
        null, NEW.id, NEW.contest_id, null, false, null
      );
    end if;
  end if;
  return NEW;
end; $$;

DROP TRIGGER IF EXISTS trg_notify_sample_status ON public.samples;
CREATE TRIGGER trg_notify_sample_status
  AFTER UPDATE ON public.samples
  FOR EACH ROW EXECUTE FUNCTION public.trg_notify_sample_status();

-- D) Judge assignment -> Judge and Participant
create or replace function public.trg_notify_judge_assignment()
returns trigger
language plpgsql
security definer
as $$
DECLARE s record; j record;
begin
  select s1.*, p.email as owner_email into s
  from public.samples s1
  left join public.profiles p on p.id = s1.user_id
  where s1.id = NEW.sample_id;

  select * into j from public.profiles where id = NEW.judge_id;

  -- Notify judge
  perform public.notify_user(
    NEW.judge_id, 'sample_assigned_to_judge', 'high',
    'New sample assignment',
    'You have been assigned sample '||coalesce(s.tracking_code,'')||' for evaluation.',
    null, NEW.sample_id, s.contest_id, s.user_id, true, null
  );

  -- Notify participant
  if s.user_id is not null then
    perform public.notify_user(
      s.user_id, 'sample_assigned_to_judge', 'medium',
      'Sample assigned to a judge',
      'Your sample '||coalesce(s.tracking_code,'')||' has been assigned to judge '||coalesce(j.name,j.email),
      null, NEW.sample_id, s.contest_id, NEW.judge_id, false, null
    );
  end if;

  return NEW;
end; $$;

DROP TRIGGER IF EXISTS trg_notify_judge_assignment ON public.judge_assignments;
CREATE TRIGGER trg_notify_judge_assignment
  AFTER INSERT ON public.judge_assignments
  FOR EACH ROW EXECUTE FUNCTION public.trg_notify_judge_assignment();

-- E) Judge sensory evaluation -> Admins, Directors, Participant
create or replace function public.trg_notify_sensory_evaluation()
returns trigger
language plpgsql
security definer
as $$
DECLARE s record; j record;
begin
  select * into s from public.samples where id = NEW.sample_id;
  select * into j from public.profiles where id = NEW.judge_id;

  perform public.broadcast_to_role(
    'admin', 'judge_evaluated_sample', 'medium',
    'Judge submitted an evaluation',
    'Judge '||coalesce(j.name,j.email)||' evaluated sample '||coalesce(NEW.sample_code,'')||'.',
    null, NEW.sample_id, s.contest_id, NEW.judge_id, false, null
  );

  perform public.broadcast_to_role(
    'director', 'judge_evaluated_sample', 'medium',
    'Judge submitted an evaluation',
    'Judge '||coalesce(j.name,j.email)||' evaluated sample '||coalesce(NEW.sample_code,'')||'.',
    null, NEW.sample_id, s.contest_id, NEW.judge_id, false, null
  );

  if s.user_id is not null then
    perform public.notify_user(
      s.user_id, 'judge_evaluated_sample', 'medium',
      'Your sample was evaluated by a judge',
      'Judge '||coalesce(j.name,j.email)||' completed evaluation for your sample '||coalesce(NEW.sample_code,'')||'.',
      null, NEW.sample_id, s.contest_id, NEW.judge_id, false, null
    );
  end if;

  return NEW;
end; $$;

DROP TRIGGER IF EXISTS trg_notify_sensory_evaluation ON public.sensory_evaluations;
CREATE TRIGGER trg_notify_sensory_evaluation
  AFTER INSERT ON public.sensory_evaluations
  FOR EACH ROW EXECUTE FUNCTION public.trg_notify_sensory_evaluation();

-- F) Evaluator final evaluation -> Admins, Directors, Participant
create or replace function public.trg_notify_final_evaluation()
returns trigger
language plpgsql
security definer
as $$
DECLARE s record; e record;
begin
  select * into s from public.samples where id = NEW.sample_id;
  select * into e from public.profiles where id = NEW.evaluator_id;

  perform public.broadcast_to_role(
    'admin', 'evaluator_evaluated_sample', 'medium',
    'Evaluator submitted a final evaluation',
    'Evaluator '||coalesce(e.name,e.email)||' evaluated sample '||coalesce(NEW.sample_id::text,'')||'.',
    null, NEW.sample_id, s.contest_id, NEW.evaluator_id, false, null
  );

  perform public.broadcast_to_role(
    'director', 'evaluator_evaluated_sample', 'medium',
    'Evaluator submitted a final evaluation',
    'Evaluator '||coalesce(e.name,e.email)||' evaluated sample '||coalesce(NEW.sample_id::text,'')||'.',
    null, NEW.sample_id, s.contest_id, NEW.evaluator_id, false, null
  );

  if s.user_id is not null then
    perform public.notify_user(
      s.user_id, 'evaluator_evaluated_sample', 'medium',
      'Your sample was evaluated by an evaluator',
      'Evaluator '||coalesce(e.name,e.email)||' completed a final evaluation for your sample.',
      null, NEW.sample_id, s.contest_id, NEW.evaluator_id, false, null
    );
  end if;

  return NEW;
end; $$;

DROP TRIGGER IF EXISTS trg_notify_final_evaluation ON public.final_evaluations;
CREATE TRIGGER trg_notify_final_evaluation
  AFTER INSERT ON public.final_evaluations
  FOR EACH ROW EXECUTE FUNCTION public.trg_notify_final_evaluation();

-- G) Contest created -> Directors
create or replace function public.trg_notify_contest_created()
returns trigger
language plpgsql
security definer
as $$
BEGIN
  perform public.broadcast_to_role(
    'admin', 'contest_created', 'medium',
    'New contest created',
    'A new contest has been created: '||NEW.name||' ('||NEW.location||')',
    null, null, NEW.id, NEW.created_by, false, null
  );
  perform public.broadcast_to_role(
    'director', 'contest_created', 'medium',
    'New contest created',
    'A new contest has been created: '||NEW.name||' ('||NEW.location||')',
    null, null, NEW.id, NEW.created_by, false, null
  );
  perform public.broadcast_to_role(
    'judge', 'contest_created', 'medium',
    'New contest created',
    'A new contest has been created: '||NEW.name||' ('||NEW.location||')',
    null, null, NEW.id, NEW.created_by, false, null
  );
  perform public.broadcast_to_role(
    'participant', 'contest_created', 'medium',
    'New contest created',
    'A new contest has been created: '||NEW.name||' ('||NEW.location||')',
    null, null, NEW.id, NEW.created_by, false, null
  );
  perform public.broadcast_to_role(
    'evaluator', 'contest_created', 'medium',
    'New contest created',
    'A new contest has been created: '||NEW.name||' ('||NEW.location||')',
    null, null, NEW.id, NEW.created_by, false, null
  );
  return NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_notify_contest_created ON public.contests;
CREATE TRIGGER trg_notify_contest_created
  AFTER INSERT ON public.contests
  FOR EACH ROW EXECUTE FUNCTION public.trg_notify_contest_created();

-- H) Contest enters final evaluation stage -> Evaluators (contests.final_evaluation toggled true)
create or replace function public.trg_notify_contest_final_stage()
returns trigger
language plpgsql
security definer
as $$
begin
  if (OLD.final_evaluation is distinct from NEW.final_evaluation) and NEW.final_evaluation = true then
    perform public.broadcast_to_role(
      'evaluator', 'contest_final_stage', 'high',
      'Contest entered final evaluation stage',
      'Contest '||NEW.name||' is now in final evaluation. Please proceed as instructed.',
      null, null, NEW.id, NEW.created_by, true, null
    );
  end if;
  return NEW;
end; $$;

DROP TRIGGER IF EXISTS trg_notify_contest_final_stage ON public.contests;
CREATE TRIGGER trg_notify_contest_final_stage
  AFTER UPDATE ON public.contests
  FOR EACH ROW EXECUTE FUNCTION public.trg_notify_contest_final_stage();

-- I) Contest completed (optional hook) -> Directors
-- If you add a contests.status column and set to 'completed', adjust this trigger accordingly.
-- For now, provide a callable function to notify completion.
create or replace function public.notify_contest_completed(p_contest_id uuid)
returns void
language plpgsql
security definer
as $$
DECLARE c record;
begin
  select * into c from public.contests where id = p_contest_id;
  if c.id is not null then
    perform public.broadcast_to_role(
      'admin', 'contest_completed', 'medium',
      'Contest completed',
      'Contest '||c.name||' has been marked as completed.',
      null, null, c.id, c.created_by, false, null
    );
    perform public.broadcast_to_role(
      'director', 'contest_completed', 'medium',
      'Contest completed',
      'Contest '||c.name||' has been marked as completed.',
      null, null, c.id, c.created_by, false, null
    );
    perform public.broadcast_to_role(
      'judge', 'contest_completed', 'medium',
      'Contest completed',
      'Contest '||c.name||' has been marked as completed.',
      null, null, c.id, c.created_by, false, null
    );
    perform public.broadcast_to_role(
      'participant', 'contest_completed', 'medium',
      'Contest completed',
      'Contest '||c.name||' has been marked as completed.',
      null, null, c.id, c.created_by, false, null
    );
    perform public.broadcast_to_role(
      'evaluator', 'contest_completed', 'medium',
      'Contest completed',
      'Contest '||c.name||' has been marked as completed.',
      null, null, c.id, c.created_by, false, null
    );
  end if;
end; $$;

grant execute on function public.notify_contest_completed(uuid) to anon, authenticated;

-- J) Final ranking top 3 -> Participants (trigger on top_results)
create or replace function public.trg_notify_top3()
returns trigger
language plpgsql
security definer
as $$
DECLARE s record;
begin
  if NEW.rank between 1 and 3 then
    select * into s from public.samples where id = NEW.sample_id;
    if s.user_id is not null then
      perform public.notify_user(
        s.user_id, 'final_ranking_top3', 'high',
        'Congratulations! Your sample ranked '||NEW.rank::text,
        'Your sample achieved rank '||NEW.rank::text||' with average score '||NEW.average_score::text||'.',
        null, NEW.sample_id, NEW.contest_id, null, false, null
      );
    end if;
  end if;
  return NEW;
end; $$;

DROP TRIGGER IF EXISTS trg_notify_top3 ON public.top_results;
CREATE TRIGGER trg_notify_top3
  AFTER INSERT OR UPDATE ON public.top_results
  FOR EACH ROW EXECUTE FUNCTION public.trg_notify_top3();