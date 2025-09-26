-- Migration to add draft status support for samples

-- Add 'draft' status to the existing status check constraint
ALTER TABLE public.samples 
DROP CONSTRAINT IF EXISTS samples_status_check;

ALTER TABLE public.samples 
ADD CONSTRAINT samples_status_check 
CHECK (status IN ('draft', 'submitted', 'received', 'disqualified', 'approved', 'evaluated'));

-- Update the default status to 'draft' for new samples
ALTER TABLE public.samples 
ALTER COLUMN status SET DEFAULT 'draft';

-- Remove the constraint that requires agreed_to_terms to be TRUE for drafts
ALTER TABLE public.samples 
DROP CONSTRAINT IF EXISTS valid_terms_agreement;

-- Add a new constraint that only requires agreed_to_terms for submitted samples
ALTER TABLE public.samples 
ADD CONSTRAINT valid_terms_agreement 
CHECK (
    (status = 'draft') OR 
    (status != 'draft' AND agreed_to_terms = TRUE)
);

-- Allow users to update their draft samples (extend the existing policy)
DROP POLICY IF EXISTS "Users can update their own samples" ON public.samples;
CREATE POLICY "Users can update their own samples" ON public.samples
    FOR UPDATE USING (
        auth.uid() = user_id AND 
        status IN ('draft', 'submitted', 'received') -- Allow updates for drafts and early statuses
    );

-- Add index for draft status queries
CREATE INDEX IF NOT EXISTS idx_samples_status_draft ON public.samples(status) WHERE status = 'draft';

-- Add a function to clean up old drafts (optional - can be called periodically)
CREATE OR REPLACE FUNCTION cleanup_old_drafts()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    -- Delete drafts older than 30 days
    DELETE FROM public.samples 
    WHERE status = 'draft' 
    AND created_at < NOW() - INTERVAL '30 days';
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission on the cleanup function
GRANT EXECUTE ON FUNCTION cleanup_old_drafts() TO authenticated;

-- Add product_type column if it doesn't exist (for multi-product support)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'samples' AND column_name = 'product_type') THEN
        ALTER TABLE public.samples 
        ADD COLUMN product_type TEXT DEFAULT 'bean' 
        CHECK (product_type IN ('bean', 'liquor', 'chocolate'));
    END IF;
END $$;

-- Add chocolate-specific fields if they don't exist
DO $$ 
BEGIN
    -- Chocolate fields
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'samples' AND column_name = 'chocolate_data') THEN
        ALTER TABLE public.samples 
        ADD COLUMN chocolate_data JSONB;
    END IF;
    
    -- Liquor fields
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'samples' AND column_name = 'liquor_data') THEN
        ALTER TABLE public.samples 
        ADD COLUMN liquor_data JSONB;
    END IF;
    
    -- Bean certifications (if not already JSONB)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'samples' AND column_name = 'bean_certifications') THEN
        ALTER TABLE public.samples 
        ADD COLUMN bean_certifications JSONB;
    END IF;
    
    -- Lot number and harvest date for all product types
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'samples' AND column_name = 'lot_number') THEN
        ALTER TABLE public.samples 
        ADD COLUMN lot_number TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'samples' AND column_name = 'harvest_date') THEN
        ALTER TABLE public.samples 
        ADD COLUMN harvest_date DATE;
    END IF;
    
    -- Growing altitude
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'samples' AND column_name = 'growing_altitude_masl') THEN
        ALTER TABLE public.samples 
        ADD COLUMN growing_altitude_masl INTEGER;
    END IF;
END $$;

-- Create index for product_type
CREATE INDEX IF NOT EXISTS idx_samples_product_type ON public.samples(product_type);

-- Update the tracking code generation to be optional for drafts
CREATE OR REPLACE FUNCTION generate_tracking_code_if_needed()
RETURNS TRIGGER AS $$
BEGIN
    -- Only generate tracking code when status changes from draft to submitted
    IF OLD.status = 'draft' AND NEW.status = 'submitted' AND NEW.tracking_code IS NULL THEN
        NEW.tracking_code := generate_tracking_code();
    END IF;
    
    -- If it's a new draft, don't require tracking code
    IF NEW.status = 'draft' AND NEW.tracking_code IS NULL THEN
        NEW.tracking_code := NULL;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic tracking code generation
DROP TRIGGER IF EXISTS auto_generate_tracking_code ON public.samples;
CREATE TRIGGER auto_generate_tracking_code
    BEFORE INSERT OR UPDATE ON public.samples
    FOR EACH ROW EXECUTE FUNCTION generate_tracking_code_if_needed();

-- Allow NULL tracking codes for drafts
ALTER TABLE public.samples 
ALTER COLUMN tracking_code DROP NOT NULL;

-- Add constraint to ensure tracking code is present for non-draft samples
ALTER TABLE public.samples 
ADD CONSTRAINT tracking_code_required_for_submitted 
CHECK (
    (status = 'draft') OR 
    (status != 'draft' AND tracking_code IS NOT NULL)
);

-- Make QR code data optional for drafts
ALTER TABLE public.samples 
ALTER COLUMN qr_code_data DROP NOT NULL;

-- Add constraint to ensure QR code data is present for non-draft samples
ALTER TABLE public.samples 
ADD CONSTRAINT qr_code_data_required_for_submitted 
CHECK (
    (status = 'draft') OR 
    (status != 'draft' AND qr_code_data IS NOT NULL)
);