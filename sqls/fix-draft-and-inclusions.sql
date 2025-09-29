-- Comprehensive fix for draft functionality and chocolate inclusions
-- This migration addresses three main issues:
-- 1. Allow drafts to have null tracking_code and qr_code_data
-- 2. Allow drafts to have agreed_to_terms = false (only require true for submitted samples)
-- 3. Ensure with_inclusions field exists in chocolate table

-- Fix draft constraints
-- Make tracking_code nullable (it will be generated when submitted)
ALTER TABLE public.sample ALTER COLUMN tracking_code DROP NOT NULL;

-- Make qr_code_data nullable (it will be generated when submitted)
ALTER TABLE public.sample ALTER COLUMN qr_code_data DROP NOT NULL;

-- Drop the existing valid_terms_agreement constraint if it exists
ALTER TABLE public.sample DROP CONSTRAINT IF EXISTS valid_terms_agreement;

-- Add constraint to ensure tracking_code and qr_code_data are present for submitted samples
ALTER TABLE public.sample 
ADD CONSTRAINT check_submitted_sample_requirements CHECK (
    CASE 
        WHEN status = 'draft' THEN TRUE
        ELSE tracking_code IS NOT NULL AND qr_code_data IS NOT NULL
    END
);

-- Add new constraint that allows drafts to have agreed_to_terms = false
-- but requires agreed_to_terms = true for submitted samples
ALTER TABLE public.sample 
ADD CONSTRAINT valid_terms_agreement CHECK (
    CASE 
        WHEN status = 'draft' THEN TRUE
        ELSE agreed_to_terms = true
    END
);

-- Add with_inclusions field to chocolate table if it doesn't exist
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

-- Add comments to document the changes
COMMENT ON COLUMN public.sample.tracking_code IS 'Tracking code for the sample. NULL for drafts, required for submitted samples.';
COMMENT ON COLUMN public.sample.qr_code_data IS 'QR code data in JSON format. NULL for drafts, required for submitted samples.';
COMMENT ON COLUMN public.sample.agreed_to_terms IS 'Terms agreement status. Can be false for drafts, must be true for submitted samples.';
COMMENT ON COLUMN public.chocolate.with_inclusions IS 'Indicates if the chocolate contains inclusions like salt, spices, or nuts';

-- Grant necessary permissions (in case they're needed)
GRANT ALL ON public.sample TO anon, authenticated;
GRANT ALL ON public.chocolate TO anon, authenticated;