-- Top Results materialization and RLS adjustments
-- Creates a table to store Top 10 results (averaged across judges per sample)
-- and keeps it updated in near real-time via triggers on sensory_evaluations

create extension if not exists pgcrypto;

-- 1) Table to store top results (overall, not per-contest; extend later if needed)
create table if not exists public.top_results (
  sample_id uuid primary key references public.samples(id) on delete cascade,
  contest_id uuid references public.contests(id) on delete set null,
  average_score numeric(4,2) not null,
  evaluations_count integer not null default 0,
  latest_evaluation_date date,
  rank integer not null,
  updated_at timestamptz not null default now()
);

alter table public.top_results enable row level security;

-- Allow authenticated users to read top results (participants, judges, directors, admins)
DO $$ BEGIN
  CREATE POLICY "any authenticated can view top_results" ON public.top_results
    FOR SELECT USING (
      EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid()
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2) Recompute function to refresh Top 10 (overall)
create or replace function public.recompute_top_results()
returns void
language plpgsql
security definer
as $$
begin
  -- Recompute averages per sample from approved sensory evaluations
  -- Use a guarded DELETE (with WHERE) to satisfy PostgREST protection
  delete from public.top_results where true;
  
  with aggregated as (
    select
      se.sample_id,
      avg(se.overall_quality)::numeric(4,2) as avg_score,
      count(*)::int as eval_count,
      max(se.evaluation_date) as latest_date
    from public.sensory_evaluations se
    where se.verdict = 'Approved'
      and se.overall_quality is not null
    group by se.sample_id
  ), ranked as (
    select a.sample_id,
           a.avg_score,
           a.eval_count,
           a.latest_date,
           s.contest_id,
           row_number() over (order by a.avg_score desc, a.latest_date desc) as rk
    from aggregated a
    join public.samples s on s.id = a.sample_id
  )
  insert into public.top_results (sample_id, contest_id, average_score, evaluations_count, latest_evaluation_date, rank, updated_at)
  select sample_id, contest_id, avg_score, eval_count, latest_date, rk, now()
  from ranked
  where rk <= 10;
end;
$$;

grant execute on function public.recompute_top_results() to anon, authenticated;

-- 3) Trigger to keep top_results up to date
create or replace function public.refresh_top_results_trigger()
returns trigger
language plpgsql
security definer
as $$
begin
  perform public.recompute_top_results();
  if tg_op = 'INSERT' then
    return new;
  elsif tg_op = 'UPDATE' then
    return new;
  else
    return old;
  end if;
end;
$$;

drop trigger if exists trg_refresh_top_results on public.sensory_evaluations;
create trigger trg_refresh_top_results
  after insert or update or delete on public.sensory_evaluations
  for each row execute function public.refresh_top_results_trigger();

-- Initial populate
select public.recompute_top_results();

-- 4) RLS: Allow judges to view all sensory evaluations (for results dashboard)
DO $$ BEGIN
  CREATE POLICY "judges can view all evaluations" ON public.sensory_evaluations
    FOR SELECT USING (
      EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid()
          AND p.role = 'judge'
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;