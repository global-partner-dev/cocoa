-- Remove payment-related columns from samples table
-- This migration removes payment functionality from sample submissions

-- Remove payment-related columns from samples table
ALTER TABLE public.samples 
  DROP COLUMN IF EXISTS payment_method,
  DROP COLUMN IF EXISTS payment_status,
  DROP COLUMN IF EXISTS payment_reference;

-- Update the samples table constraint to remove payment status
ALTER TABLE public.samples DROP CONSTRAINT IF EXISTS samples_payment_status_check;

-- Remove any payment-related policies that might exist
DROP POLICY IF EXISTS "Users can update payment status" ON public.samples;


-- Verify the changes
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'samples' 
AND table_schema = 'public' 
AND table_name = 'samples'
ORDER BY ordinal_position;
