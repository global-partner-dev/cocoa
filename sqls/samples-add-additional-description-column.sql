-- Migration to add the optional additional sample description field to samples
ALTER TABLE IF EXISTS public.samples
  ADD COLUMN IF NOT EXISTS additional_sample_description TEXT;

COMMENT ON COLUMN public.samples.additional_sample_description IS
  'Optional additional description provided by the participant (max 500 characters).';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints tc
    WHERE tc.constraint_name = 'samples_additional_sample_description_length_check'
      AND tc.table_schema = 'public'
      AND tc.table_name = 'samples'
  ) THEN
    ALTER TABLE public.samples
      ADD CONSTRAINT samples_additional_sample_description_length_check
        CHECK (
          additional_sample_description IS NULL
          OR char_length(additional_sample_description) <= 500
        );
  END IF;
END $$;