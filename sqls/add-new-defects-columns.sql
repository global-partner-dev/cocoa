-- Migration to add new defect attributes to sensory_evaluations table
-- Adds: Excessive Astringency and Unbalanced Bitterness

-- Add new defect columns
ALTER TABLE public.sensory_evaluations 
ADD COLUMN IF NOT EXISTS defects_excessive_astringency DECIMAL(3,1) NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS defects_unbalanced_bitterness DECIMAL(3,1) NOT NULL DEFAULT 0;

-- Add constraints to ensure values are within 0-10 range
-- Note: Using DO block for idempotent constraint creation
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'check_defects_excessive_astringency'
    ) THEN
        ALTER TABLE public.sensory_evaluations 
        ADD CONSTRAINT check_defects_excessive_astringency 
            CHECK (defects_excessive_astringency >= 0 AND defects_excessive_astringency <= 10);
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'check_defects_unbalanced_bitterness'
    ) THEN
        ALTER TABLE public.sensory_evaluations 
        ADD CONSTRAINT check_defects_unbalanced_bitterness 
            CHECK (defects_unbalanced_bitterness >= 0 AND defects_unbalanced_bitterness <= 10);
    END IF;
END $$;

-- Add comments to document the new columns
COMMENT ON COLUMN public.sensory_evaluations.defects_excessive_astringency IS 
'Unwanted Astringency: Evaluate whether the astringency interferes with flavor appreciation, lingers uncomfortably, or dominates the sensory profile. Do not confuse it with mild or structural astringency, which may be acceptable. Scale: 0-10';

COMMENT ON COLUMN public.sensory_evaluations.defects_unbalanced_bitterness IS 
'Unwanted Bitterness: Determine whether the bitterness is aggressive, sharp, or unpleasant, and whether it negatively impacts the overall product experience. Do not penalize if the bitterness is integrated and adds complexity. Scale: 0-10';