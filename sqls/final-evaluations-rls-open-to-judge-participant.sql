-- Allow judges and participants to read final evaluations when the contest is in final evaluation stage
-- Run this in Supabase SQL editor after creating the final_evaluations table

-- Keep existing read policy for evaluators/admins/directors, but recreate it for clarity
drop policy if exists "Evaluators and admins/directors can read final evals" on public.final_evaluations;
create policy "Evaluators and admins/directors can read final evals" on public.final_evaluations
  for select
  using (
    -- Evaluators can read their own
    evaluator_id = auth.uid()
    OR
    -- Admins/Directors can read all
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role in ('admin','director')
    )
  );

-- New: Judges and participants can read when the contest has entered final evaluation
-- Note: Multiple select policies are OR'ed together

drop policy if exists "Judges/Participants can read final evals when contest is in final evaluation" on public.final_evaluations;
create policy "Judges/Participants can read final evals when contest is in final evaluation" on public.final_evaluations
  for select
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role in ('judge','participant')
    )
    AND
    exists (
      select 1 from public.contests c
      where c.id = final_evaluations.contest_id and c.final_evaluation = true
    )
  );