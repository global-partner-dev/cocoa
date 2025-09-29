-- Fix constraints for draft samples
-- Allow tracking_code and qr_code_data to be null for draft samples

-- Make tracking_code nullable (it will be generated when submitted)
ALTER TABLE public.sample ALTER COLUMN tracking_code DROP NOT NULL;

-- Make qr_code_data nullable (it will be generated when submitted)
ALTER TABLE public.sample ALTER COLUMN qr_code_data DROP NOT NULL;

-- Add constraint to ensure tracking_code and qr_code_data are present for submitted samples
ALTER TABLE public.sample 
ADD CONSTRAINT check_submitted_sample_requirements CHECK (
    CASE 
        WHEN status = 'draft' THEN TRUE
        ELSE tracking_code IS NOT NULL AND qr_code_data IS NOT NULL
    END
);

-- Update the unique constraint on tracking_code to handle nulls properly
-- (PostgreSQL treats NULL values as distinct, so this is already handled correctly)

-- Add comment to document the change
COMMENT ON COLUMN public.sample.tracking_code IS 'Tracking code for the sample. NULL for drafts, required for submitted samples.';
COMMENT ON COLUMN public.sample.qr_code_data IS 'QR code data in JSON format. NULL for drafts, required for submitted samples.';