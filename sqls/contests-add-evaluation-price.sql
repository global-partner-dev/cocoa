-- Add evaluation_price column to contests table
ALTER TABLE IF EXISTS public.contests
  ADD COLUMN IF NOT EXISTS evaluation_price DECIMAL(10,2) NOT NULL DEFAULT 0;

-- Backfill existing rows to explicit 0 where null (safety)
UPDATE public.contests SET evaluation_price = 0 WHERE evaluation_price IS NULL;

-- Grant permissions (if needed; inherits from table grants)
-- No extra policies required; existing RLS applies.