-- Extend physical_evaluations to store typical/atypical odor checklists (non-critical)
ALTER TABLE public.physical_evaluations
  ADD COLUMN IF NOT EXISTS typical_odors TEXT[] DEFAULT '{}' NOT NULL,
  ADD COLUMN IF NOT EXISTS atypical_odors TEXT[] DEFAULT '{}' NOT NULL;

-- No policy changes required; columns inherit existing RLS