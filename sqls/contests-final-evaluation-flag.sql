-- Add boolean flag for final evaluation to contests table
-- Safe to run multiple times due to IF NOT EXISTS

ALTER TABLE public.contests
ADD COLUMN IF NOT EXISTS final_evaluation boolean NOT NULL DEFAULT false;

-- Optional: backfill or ensure default is false for existing rows
UPDATE public.contests SET final_evaluation = COALESCE(final_evaluation, false);

-- Grant usage in RLS environments if needed (adjust as per your policy model)
-- Example (commented):
-- ALTER TABLE public.contests ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "contests read" ON public.contests FOR SELECT USING (true);