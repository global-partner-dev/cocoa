-- Fix notification trigger to not fire for draft samples
-- This prevents constraint violations when saving draft samples

-- Update the sample added notification trigger to only fire for non-draft samples
CREATE OR REPLACE FUNCTION public.trg_notify_sample_added()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE 
  owner_email text;
BEGIN
  -- Only create notifications for non-draft samples
  IF NEW.status != 'draft' THEN
    SELECT email INTO owner_email FROM public.profiles WHERE id = NEW.user_id;
    
    PERFORM public.broadcast_to_role(
      'admin', 'sample_added', 'high',
      'New sample added',
      'Sample ' || COALESCE(NEW.tracking_code, 'PENDING') || ' was submitted by ' || COALESCE(owner_email, 'unknown'),
      null, NEW.id, NEW.contest_id, NEW.user_id, false, null
    );
    
    PERFORM public.broadcast_to_role(
      'director', 'sample_added', 'high',
      'New sample added',
      'Sample ' || COALESCE(NEW.tracking_code, 'PENDING') || ' was submitted by ' || COALESCE(owner_email, 'unknown'),
      null, NEW.id, NEW.contest_id, NEW.user_id, false, null
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Also update the constraint to allow draft samples to have incomplete data
-- Modify the product type requirements constraint to be more flexible for drafts
ALTER TABLE public.samples DROP CONSTRAINT IF EXISTS check_product_type_requirements;
ALTER TABLE public.samples 
ADD CONSTRAINT check_product_type_requirements CHECK (
    CASE 
        WHEN status = 'draft' THEN TRUE  -- Allow any data for drafts
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

-- Update chocolate details constraint to be more flexible for drafts
ALTER TABLE public.samples DROP CONSTRAINT IF EXISTS check_chocolate_details;
ALTER TABLE public.samples 
ADD CONSTRAINT check_chocolate_details CHECK (
    status = 'draft' OR  -- Allow any data for drafts
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

-- Update liquor details constraint to be more flexible for drafts
ALTER TABLE public.samples DROP CONSTRAINT IF EXISTS check_liquor_details;
ALTER TABLE public.samples 
ADD CONSTRAINT check_liquor_details CHECK (
    status = 'draft' OR  -- Allow any data for drafts
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

-- Update bean certifications constraint to be more flexible for drafts
ALTER TABLE public.samples DROP CONSTRAINT IF EXISTS check_bean_certifications;
ALTER TABLE public.samples 
ADD CONSTRAINT check_bean_certifications CHECK (
    status = 'draft' OR  -- Allow any data for drafts
    bean_certifications IS NULL OR (
        jsonb_typeof(bean_certifications) = 'object' AND
        (bean_certifications ? 'organic') AND
        (bean_certifications ? 'fairtrade') AND
        (bean_certifications ? 'direct_trade') AND
        (bean_certifications ? 'none') AND
        (bean_certifications ? 'other')
    )
);