-- Add with_inclusions field to chocolate table
-- This allows tracking inclusions separately from cocoa percentage categories

ALTER TABLE public.chocolate 
ADD COLUMN IF NOT EXISTS with_inclusions BOOLEAN DEFAULT FALSE NOT NULL;

-- Add index for better performance when filtering by inclusions
CREATE INDEX IF NOT EXISTS idx_chocolate_with_inclusions ON public.chocolate(with_inclusions);

-- Update existing records to set with_inclusions based on competition_category
UPDATE public.chocolate 
SET with_inclusions = TRUE 
WHERE competition_category LIKE '%inclusions%' 
   OR competition_category LIKE '%salt%' 
   OR competition_category LIKE '%spices%' 
   OR competition_category LIKE '%nuts%';

-- Add comment to document the field
COMMENT ON COLUMN public.chocolate.with_inclusions IS 'Indicates if the chocolate contains inclusions like salt, spices, or nuts';