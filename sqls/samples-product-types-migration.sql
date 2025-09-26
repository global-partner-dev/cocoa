-- Migration to add product type support and additional fields to samples table
-- This migration extends the existing samples table to support bean, liquor, and chocolate products

-- Add new columns to samples table
ALTER TABLE public.samples 
ADD COLUMN IF NOT EXISTS product_type TEXT CHECK (product_type IN ('bean', 'liquor', 'chocolate')) DEFAULT 'bean',
ADD COLUMN IF NOT EXISTS lot_number TEXT,
ADD COLUMN IF NOT EXISTS harvest_date DATE,
ADD COLUMN IF NOT EXISTS growing_altitude_masl INTEGER,
ADD COLUMN IF NOT EXISTS bean_certifications JSONB,
ADD COLUMN IF NOT EXISTS chocolate_details JSONB,
ADD COLUMN IF NOT EXISTS liquor_details JSONB;

-- Update existing records to have product_type = 'bean' if NULL
UPDATE public.samples SET product_type = 'bean' WHERE product_type IS NULL;

-- Make product_type NOT NULL after setting defaults
ALTER TABLE public.samples ALTER COLUMN product_type SET NOT NULL;

-- Create indexes for new columns
CREATE INDEX IF NOT EXISTS idx_samples_product_type ON public.samples(product_type);
CREATE INDEX IF NOT EXISTS idx_samples_lot_number ON public.samples(lot_number);
CREATE INDEX IF NOT EXISTS idx_samples_harvest_date ON public.samples(harvest_date);

-- Create GIN indexes for JSONB columns for better query performance
CREATE INDEX IF NOT EXISTS idx_samples_bean_certifications ON public.samples USING GIN (bean_certifications);
CREATE INDEX IF NOT EXISTS idx_samples_chocolate_details ON public.samples USING GIN (chocolate_details);
CREATE INDEX IF NOT EXISTS idx_samples_liquor_details ON public.samples USING GIN (liquor_details);

-- Update constraints to handle different product types
-- For bean products, country, farm_name, and owner_full_name are required
-- For chocolate and liquor products, these fields are optional as they have their own detail structures

-- Drop the existing NOT NULL constraints that are too restrictive
ALTER TABLE public.samples ALTER COLUMN country DROP NOT NULL;
ALTER TABLE public.samples ALTER COLUMN farm_name DROP NOT NULL;
ALTER TABLE public.samples ALTER COLUMN owner_full_name DROP NOT NULL;

-- Add a constraint to ensure required fields based on product type
ALTER TABLE public.samples 
ADD CONSTRAINT check_product_type_requirements CHECK (
    CASE 
        WHEN product_type = 'bean' THEN 
            country IS NOT NULL AND 
            farm_name IS NOT NULL AND 
            owner_full_name IS NOT NULL
        WHEN product_type = 'chocolate' THEN 
            chocolate_details IS NOT NULL
        WHEN product_type = 'liquor' THEN 
            liquor_details IS NOT NULL
        ELSE FALSE
    END
);

-- Add constraint to ensure chocolate details have required fields
ALTER TABLE public.samples 
ADD CONSTRAINT check_chocolate_details CHECK (
    product_type != 'chocolate' OR (
        chocolate_details IS NOT NULL AND
        chocolate_details ? 'name' AND
        chocolate_details ? 'brand' AND
        chocolate_details ? 'batch' AND
        chocolate_details ? 'manufacturerCountry' AND
        chocolate_details ? 'cocoaOriginCountry' AND
        chocolate_details ? 'cocoaVariety' AND
        chocolate_details ? 'fermentationMethod' AND
        chocolate_details ? 'dryingMethod' AND
        chocolate_details ? 'type' AND
        chocolate_details ? 'cocoaPercentage' AND
        chocolate_details ? 'temperingMethod'
    )
);

-- Add constraint to ensure liquor details have required fields
ALTER TABLE public.samples 
ADD CONSTRAINT check_liquor_details CHECK (
    product_type != 'liquor' OR (
        liquor_details IS NOT NULL AND
        liquor_details ? 'name' AND
        liquor_details ? 'brand' AND
        liquor_details ? 'batch' AND
        liquor_details ? 'countryProcessing' AND
        liquor_details ? 'lecithinPercentage' AND
        liquor_details ? 'processingMethod' AND
        liquor_details ? 'cocoaOriginCountry'
    )
);

-- Add constraint for bean certifications structure
ALTER TABLE public.samples 
ADD CONSTRAINT check_bean_certifications CHECK (
    bean_certifications IS NULL OR (
        jsonb_typeof(bean_certifications) = 'object' AND
        (bean_certifications ? 'organic') AND
        (bean_certifications ? 'fairtrade') AND
        (bean_certifications ? 'direct_trade') AND
        (bean_certifications ? 'none') AND
        (bean_certifications ? 'other')
    )
);

-- Update the cooperative name constraint to be more flexible for different product types
ALTER TABLE public.samples DROP CONSTRAINT IF EXISTS valid_cooperative_name;
ALTER TABLE public.samples 
ADD CONSTRAINT valid_cooperative_name CHECK (
    product_type != 'bean' OR (
        (belongs_to_cooperative = FALSE AND cooperative_name IS NULL) OR
        (belongs_to_cooperative = TRUE AND cooperative_name IS NOT NULL)
    )
);

-- Create a function to validate chocolate details structure
CREATE OR REPLACE FUNCTION validate_chocolate_details(details JSONB)
RETURNS BOOLEAN AS $$
BEGIN
    -- Check required string fields
    IF NOT (details ? 'name' AND details ? 'brand' AND details ? 'batch' AND
            details ? 'manufacturerCountry' AND details ? 'cocoaOriginCountry' AND
            details ? 'cocoaVariety' AND details ? 'fermentationMethod' AND
            details ? 'dryingMethod' AND details ? 'type' AND details ? 'temperingMethod') THEN
        RETURN FALSE;
    END IF;
    
    -- Check numeric fields
    IF NOT (details ? 'cocoaPercentage' AND 
            jsonb_typeof(details->'cocoaPercentage') = 'number' AND
            (details->>'cocoaPercentage')::numeric BETWEEN 0 AND 100) THEN
        RETURN FALSE;
    END IF;
    
    -- Check array fields exist and are arrays
    IF NOT (details ? 'sweeteners' AND jsonb_typeof(details->'sweeteners') = 'array' AND
            details ? 'lecithin' AND jsonb_typeof(details->'lecithin') = 'array' AND
            details ? 'naturalFlavors' AND jsonb_typeof(details->'naturalFlavors') = 'array' AND
            details ? 'allergens' AND jsonb_typeof(details->'allergens') = 'array' AND
            details ? 'certifications' AND jsonb_typeof(details->'certifications') = 'array') THEN
        RETURN FALSE;
    END IF;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Create a function to validate liquor details structure
CREATE OR REPLACE FUNCTION validate_liquor_details(details JSONB)
RETURNS BOOLEAN AS $$
BEGIN
    -- Check required string fields
    IF NOT (details ? 'name' AND details ? 'brand' AND details ? 'batch' AND
            details ? 'countryProcessing' AND details ? 'processingMethod' AND
            details ? 'cocoaOriginCountry') THEN
        RETURN FALSE;
    END IF;
    
    -- Check numeric fields
    IF NOT (details ? 'lecithinPercentage' AND 
            jsonb_typeof(details->'lecithinPercentage') = 'number' AND
            (details->>'lecithinPercentage')::numeric BETWEEN 0 AND 100) THEN
        RETURN FALSE;
    END IF;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions for new functions
GRANT EXECUTE ON FUNCTION validate_chocolate_details(JSONB) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION validate_liquor_details(JSONB) TO anon, authenticated;

-- Add comments to document the new columns
COMMENT ON COLUMN public.samples.product_type IS 'Type of product being submitted: bean, liquor, or chocolate';
COMMENT ON COLUMN public.samples.lot_number IS 'Lot number for the product (used by all product types)';
COMMENT ON COLUMN public.samples.harvest_date IS 'Harvest date for cocoa beans (used by bean and liquor types)';
COMMENT ON COLUMN public.samples.growing_altitude_masl IS 'Growing altitude in meters above sea level (bean type only)';
COMMENT ON COLUMN public.samples.bean_certifications IS 'JSON object containing certification flags for bean products';
COMMENT ON COLUMN public.samples.chocolate_details IS 'JSON object containing detailed information for chocolate products';
COMMENT ON COLUMN public.samples.liquor_details IS 'JSON object containing detailed information for liquor/mass products';