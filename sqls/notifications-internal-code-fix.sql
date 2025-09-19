-- Use internal sample code in notifications for final evaluations instead of UUID
-- Computes code as INT-YYYYMM-<last3-of-id>

create or replace function public.trg_notify_final_evaluation()
returns trigger
language plpgsql
security definer
as $$
DECLARE s record; e record; internal_code text;
begin
  select *, (
    'INT-'||to_char(created_at, 'YYYYMM')||'-'||upper(right(id::text, 3))
  ) as internal_code into s from public.samples where id = NEW.sample_id;
  select * into e from public.profiles where id = NEW.evaluator_id;

  perform public.broadcast_to_role(
    'admin', 'evaluator_evaluated_sample', 'medium',
    'Evaluator submitted a final evaluation',
    'Evaluator '||coalesce(e.name,e.email)||' evaluated sample '||coalesce(s.internal_code,'')||'.',
    null, NEW.sample_id, s.contest_id, NEW.evaluator_id, false, null
  );

  perform public.broadcast_to_role(
    'director', 'evaluator_evaluated_sample', 'medium',
    'Evaluator submitted a final evaluation',
    'Evaluator '||coalesce(e.name,e.email)||' evaluated sample '||coalesce(s.internal_code,'')||'.',
    null, NEW.sample_id, s.contest_id, NEW.evaluator_id, false, null
  );

  if s.user_id is not null then
    perform public.notify_user(
      s.user_id, 'evaluator_evaluated_sample', 'medium',
      'Your sample was evaluated by an evaluator',
      'Evaluator '||coalesce(e.name,e.email)||' completed a final evaluation for your sample '||coalesce(s.internal_code,'')||'.',
      null, NEW.sample_id, s.contest_id, NEW.evaluator_id, false, null
    );
  end if;

  return NEW;
end; $$;

drop trigger if exists trg_notify_final_evaluation on public.final_evaluations;
create trigger trg_notify_final_evaluation
  after insert on public.final_evaluations
  for each row execute function public.trg_notify_final_evaluation();