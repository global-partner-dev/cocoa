-- Judge Assignments migration
-- Creates a join table to assign multiple judges to a sample
-- and RLS policies for directors/admins and judges

-- Enable required extension for UUIDs (safe if already enabled)
create extension if not exists pgcrypto;

create table if not exists public.judge_assignments (
  id uuid primary key default gen_random_uuid(),
  sample_id uuid not null references public.samples(id) on delete cascade,
  judge_id uuid not null references public.profiles(id) on delete cascade,
  assigned_by uuid references public.profiles(id) on delete set null,
  assigned_at timestamptz not null default now(),
  status text not null default 'assigned' check (status in ('assigned','evaluating','completed')),
  notes text,
  unique (sample_id, judge_id)
);

alter table public.judge_assignments enable row level security;

-- Staff (admins, directors) can fully manage assignments
DO $$ BEGIN
  CREATE POLICY "staff can manage judge assignments" ON public.judge_assignments
    FOR ALL
    USING (
      EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid()
        AND role IN ('admin','director')
      )
    )
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid()
        AND role IN ('admin','director')
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Judges can view their own assignments
DO $$ BEGIN
  CREATE POLICY "judges can view own assignments" ON public.judge_assignments
    FOR SELECT USING (judge_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Judges can update status of their own assignments (optional)
DO $$ BEGIN
  CREATE POLICY "judges can update own assignment status" ON public.judge_assignments
    FOR UPDATE USING (judge_id = auth.uid())
    WITH CHECK (judge_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Helpful indexes
create index if not exists idx_judge_assignments_sample on public.judge_assignments(sample_id);
create index if not exists idx_judge_assignments_judge on public.judge_assignments(judge_id);
create index if not exists idx_judge_assignments_status on public.judge_assignments(status);