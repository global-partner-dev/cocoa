-- Final evaluations table for Top 10 evaluator scoring and final ranking
-- Run in Supabase SQL editor

create table if not exists public.final_evaluations (
  id uuid primary key default gen_random_uuid(),
  contest_id uuid not null references public.contests(id) on delete cascade,
  sample_id uuid not null references public.samples(id) on delete cascade,
  evaluator_id uuid not null references public.profiles(id) on delete cascade,
  evaluation_date timestamptz not null default now(),

  -- Minimal set for ranking; mirror key fields from sensory_evaluations for reuse
  overall_quality numeric(4,2) not null,
  flavor_comments text null,
  producer_recommendations text null,
  additional_positive text null,

  -- Optional breakdowns (nullable for flexibility)
  cacao numeric(4,2) null,
  bitterness numeric(4,2) null,
  astringency numeric(4,2) null,
  caramel_panela numeric(4,2) null,
  acidity_total numeric(4,2) null,
  fresh_fruit_total numeric(4,2) null,
  brown_fruit_total numeric(4,2) null,
  vegetal_total numeric(4,2) null,
  floral_total numeric(4,2) null,
  wood_total numeric(4,2) null,
  spice_total numeric(4,2) null,
  nut_total numeric(4,2) null,
  roast_degree numeric(4,2) null,
  defects_total numeric(4,2) null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Helpful indexes
create index if not exists idx_final_eval_contest on public.final_evaluations(contest_id);
create index if not exists idx_final_eval_sample on public.final_evaluations(sample_id);
create index if not exists idx_final_eval_evaluator on public.final_evaluations(evaluator_id);

-- Enable RLS
alter table public.final_evaluations enable row level security;

-- Policies
-- Evaluators can insert/update only their own evaluations
drop policy if exists "Evaluators can read own and contest admins can read all" on public.final_evaluations;
create policy "Evaluators can read own and contest admins can read all" on public.final_evaluations
  for select
  using (
    evaluator_id = auth.uid() OR
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role in ('admin','director')
    )
  );

drop policy if exists "Evaluators can insert own final evals" on public.final_evaluations;
create policy "Evaluators can insert own final evals" on public.final_evaluations
  for insert
  with check (evaluator_id = auth.uid());

drop policy if exists "Evaluators can update own final evals" on public.final_evaluations;
create policy "Evaluators can update own final evals" on public.final_evaluations
  for update
  using (evaluator_id = auth.uid());

-- Optionally allow admins/directors to update/delete
drop policy if exists "Admins/Directors can update/delete final evals" on public.final_evaluations;
create policy "Admins/Directors can update/delete final evals" on public.final_evaluations
  for all
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','director')));