-- Migration to add category field to sample table
-- This field will store the product type (cocoa bean, cocoa liquor/mass, chocolate)

-- Add category field to sample table
ALTER TABLE public.sample 
ADD COLUMN IF NOT EXISTS category TEXT CHECK (category IN ('cocoa_bean', 'cocoa_liquor', 'chocolate'));

-- Create index for better performance on category filtering
CREATE INDEX IF NOT EXISTS idx_sample_category ON public.sample(category);

-- Update existing samples to set category based on related tables
-- For cocoa bean samples
UPDATE public.sample 
SET category = 'cocoa_bean'
WHERE id IN (
    SELECT DISTINCT sample_id 
    FROM public.cocoa_bean
) AND category IS NULL;

-- For cocoa liquor samples
UPDATE public.sample 
SET category = 'cocoa_liquor'
WHERE id IN (
    SELECT DISTINCT sample_id 
    FROM public.cocoa_liquor
) AND category IS NULL;

-- For chocolate samples
UPDATE public.sample 
SET category = 'chocolate'
WHERE id IN (
    SELECT DISTINCT sample_id 
    FROM public.chocolate
) AND category IS NULL;

-- Make category field NOT NULL after populating existing data
-- First, handle any samples that might not have related records (shouldn't happen in normal operation)
UPDATE public.sample 
SET category = 'cocoa_bean' 
WHERE category IS NULL;

-- Now make the field required
ALTER TABLE public.sample 
ALTER COLUMN category SET NOT NULL;

-- Add comment to document the field
COMMENT ON COLUMN public.sample.category IS 'Product type: cocoa_bean, cocoa_liquor, or chocolate';